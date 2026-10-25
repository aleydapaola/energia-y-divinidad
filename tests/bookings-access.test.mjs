import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(session, actor) {
  const filename = new URL("../app/api/bookings/route.ts", import.meta.url).pathname;
  const reads = [],
    lists = [];
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === "@/lib/auth") {
      return { auth: async () => session };
    }
    if (name === "@/lib/prisma") {
      return {
        prisma: {
          user: {
            findUnique: async (args) => {
              reads.push(args.where);
              return args.where.id ? actor : { id: "target-user" };
            },
          },
          booking: {
            findMany: async (args) => {
              lists.push(args.where);
              return [{ id: "booking-for-" + args.where.userId }];
            },
          },
        },
      };
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return { ...mod.exports, reads, lists };
}
const actor = { id: "owner", email: "owner@example.com", role: "USER" };
const session = { user: { id: actor.id } };

test("booking lookup rejects anonymous and stale sessions before reading bookings", async () => {
  for (const [auth, user] of [
    [null, null],
    [session, null],
  ]) {
    const api = load(auth, user);
    const response = await api.GET(
      new Request("https://preview.test/api/bookings?email=other@example.com")
    );
    assert.equal(response.status, 401);
    assert.deepEqual(api.lists, []);
    if (!auth) {
      assert.deepEqual(api.reads, []);
    }
  }
});

test("an owner cannot enumerate other emails and always lists only their own bookings", async () => {
  const api = load(session, actor);
  const forbidden = await api.GET(
    new Request("https://preview.test/api/bookings?email=other@example.com")
  );
  assert.equal(forbidden.status, 403);
  assert.deepEqual(api.reads, [{ id: "owner" }]);
  assert.deepEqual(api.lists, []);
  for (const query of ["", "?email=OWNER%40example.com"]) {
    const response = await api.GET(new Request("https://preview.test/api/bookings" + query));
    assert.equal(response.status, 200);
    assert.deepEqual(api.lists.at(-1), { userId: "owner" });
  }
});

test("another user's reservations require an ADMIN role verified from the database", async () => {
  const api = load(session, { ...actor, role: "ADMIN" });
  const response = await api.GET(
    new Request("https://preview.test/api/bookings?email=other@example.com")
  );
  assert.equal(response.status, 200);
  assert.deepEqual(api.reads, [{ id: "owner" }, { email: "other@example.com" }]);
  assert.deepEqual(api.lists, [{ userId: "target-user" }]);
});

test("the retired booking creator cannot accept client prices or create guest accounts and orders", async () => {
  const api = load(null, null);
  const response = await api.POST({
    json() {
      throw new Error("Must not consume legacy payload");
    },
  });
  assert.equal(response.status, 410);
  assert.deepEqual(api.reads, []);
  assert.deepEqual(api.lists, []);
});
