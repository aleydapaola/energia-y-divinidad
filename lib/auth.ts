import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  // Prisma adapter solo en el runtime Node.js (no en Edge)
  adapter: PrismaAdapter(prisma),

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isPasswordValid) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
      }
      return session;
    },
  },

  events: {
    signIn({ user, account, isNewUser }) {
      console.warn(`[AUTH] signIn: ${user.email} (${account?.provider})`);
      if (isNewUser) {
        console.warn(`[AUTH] nuevo usuario: ${user.email}`);
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
});
