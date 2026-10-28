import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const catalog = {
  getMembershipTierById: async () => null,
  getMembershipPostById: async () => null,
};
const access = loadMembership("lib/membership-access.ts", {
  "./prisma": { prisma: {} },
  "./sanity/client": { client: {} },
  "./sanity/queries/membership": catalog,
});
const now = new Date("2026-10-28T15:00:00Z");
const post = { requiredTier: { tierLevel: 2 }, publishedAt: "2026-10-01T15:00:00Z" };
test("membership post access respects level, publication and expiration, including incomplete CMS references", () => {
  assert.equal(access.membershipPostAllowed({ tierLevel: 2 }, post, now), true);
  assert.equal(access.membershipPostAllowed({ tierLevel: 3 }, post, now), true);
  for (const [tier, change] of [
    [{ tierLevel: 1 }, {}],
    [null, {}],
    [{ tierLevel: 2 }, { requiredTier: null }],
    [{ tierLevel: 2 }, { publishedAt: "2026-11-01T00:00:00Z" }],
    [{ tierLevel: 2 }, { expirationDate: "2026-10-27T00:00:00Z" }],
  ]) {
    assert.equal(access.membershipPostAllowed(tier, { ...post, ...change }, now), false);
  }
});

test("a paid membership alone cannot unlock premium content that its benefit or explicit tier list excludes", async () => {
  for (const benefit of [false, true]) {
    for (const listed of [false, true]) {
      let checks = 0;
      const sub = {
        id: "sub",
        userId: "owner",
        membershipTierId: "tier-1",
        membershipTierName: "Esencia",
        amount: { toNumber: () => 22 },
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86400000),
      };
      const service = loadMembership("lib/membership-access.ts", {
        "./prisma": {
          prisma: {
            entitlement: { findFirst: async () => null },
            subscription: { findFirst: async () => sub },
            order: { findFirst: async () => null },
          },
        },
        "./sanity/client": {
          client: {
            fetch: async (_query, params) => {
              checks++;
              assert.equal(params.tierId, "tier-1");
              assert.equal(params.contentId, "content-1");
              return listed;
            },
          },
        },
        "./sanity/queries/membership": {
          ...catalog,
          getMembershipTierById: async () => ({
            _id: "tier-1",
            active: true,
            benefits: { premiumContent: benefit },
          }),
        },
      });
      assert.equal(
        (await service.canAccessPremiumContent("owner", "content-1")).hasAccess,
        benefit && listed
      );
      assert.equal(checks, benefit ? 1 : 0);
    }
  }
});

test("feed and detail routes exclude higher-tier posts before returning content or mutating engagement", async () => {
  let engagement = 0;
  const higher = { _id: "higher", slug: { current: "higher" }, ...post };
  const basic = {
    _id: "basic",
    slug: { current: "basic" },
    ...post,
    requiredTier: { tierLevel: 1 },
  };
  const deps = {
    "@/lib/auth": { auth: async () => ({ user: { id: "owner" } }) },
    "@/lib/membership-access": {
      hasActiveMembership: async () => true,
      getUserMembershipTier: async () => ({ tierLevel: 1 }),
      membershipPostAllowed: access.membershipPostAllowed,
      canReadMembershipPost: async () => false,
    },
    "@/lib/sanity/queries/membership": {
      getAllMembershipPosts: async () => [higher, basic],
      getMembershipPostBySlug: async () => higher,
    },
    "@/lib/membership-posts": {
      getPostEngagement: async () => {
        engagement++;
        return {};
      },
      incrementPostView: async () => {
        throw Error("Forbidden content must not record a view");
      },
    },
  };
  const feed = loadMembership("app/api/membership/posts/route.ts", deps);
  const result = await feed.GET({ nextUrl: new URL("https://preview.test/api/membership/posts") });
  assert.equal(result.status, 200);
  assert.deepEqual(
    (await result.json()).posts.map((p) => p._id),
    ["basic"]
  );
  assert.equal(engagement, 1);
  const detail = loadMembership("app/api/membership/posts/[slug]/route.ts", deps);
  assert.equal((await detail.GET({}, { params: Promise.resolve({ slug: "higher" }) })).status, 403);
  assert.equal(engagement, 1);
});
