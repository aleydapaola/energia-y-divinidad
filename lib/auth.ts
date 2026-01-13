import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
// import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcrypt"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    // Google OAuth - Deshabilitado temporalmente (credenciales no configuradas)
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // }),

    // Email/Password
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Verificar si el email está verificado
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }

      if (account?.provider) {
        token.provider = account.provider
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.provider = token.provider as string
      }
      return session
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ Usuario autenticado: ${user.email} (${account?.provider})`)

      if (isNewUser) {
        console.log(`🆕 Nuevo usuario registrado: ${user.email}`)
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
})
