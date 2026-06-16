import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@academia-alexandria/database";
import { authConfig } from "./auth.config";
import type { OIDCConfig } from "next-auth/providers";
import { createOrcidRegistrationToken } from "./orcid-registration";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ORCID OIDC provider — conditionally included when env vars are set
function orcidProvider(): OIDCConfig<{
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}> {
  return {
    id: "orcid",
    name: "ORCID",
    type: "oidc",
    issuer: "https://orcid.org",
    clientId: process.env.AUTH_ORCID_ID!,
    clientSecret: process.env.AUTH_ORCID_SECRET!,
    authorization: {
      params: { scope: "openid" },
    },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name ?? profile.given_name ?? profile.sub,
        orcidId: profile.sub,
      };
    },
  };
}

const nextAuth: NextAuthResult = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // Credentials sign-in — always allow (handled by authorize())
      if (!account || account.provider === "credentials") return true;
      if (account.provider !== "orcid") return true;

      const orcidId = account.providerAccountId;

      // 1. Check if this ORCID already has an Account record (returning user)
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "orcid",
            providerAccountId: orcidId,
          },
        },
        include: { user: { select: { bannedAt: true } } },
      });

      if (existingAccount) {
        if (existingAccount.user.bannedAt) return false;
        return true;
      }

      // 2. Check if orcidId is already on a user (linked via settings but Account missing)
      const userWithOrcid = await prisma.user.findUnique({
        where: { orcidId },
        select: { id: true, bannedAt: true },
      });

      if (userWithOrcid) {
        if (userWithOrcid.bannedAt) return false;
        return true;
      }

      // 3. Check if this is account linking from Settings (user already logged in)
      if (user.id) {
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true },
        });
        if (existingUser) {
          // Account linking — save orcidId on the existing user
          await prisma.user.update({
            where: { id: user.id },
            data: { orcidId },
          });
          return true;
        }
      }

      // 4. New user — ORCID doesn't provide email, so redirect to complete profile
      const orcidProfile = profile as
        | { name?: string; given_name?: string }
        | undefined;
      const token = createOrcidRegistrationToken({
        orcidId,
        name: orcidProfile?.name ?? orcidProfile?.given_name ?? orcidId,
      });
      return `/register/complete-profile?token=${token}`;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orcidId = user.orcidId;
        token.name = user.name;
        token.picture = user.image;
        token.banned = false;
        token.emailVerified = true;
        token.lastRefreshed = Date.now();
      }

      // Refresh from DB on explicit update or every 5 minutes
      const stale =
        !token.lastRefreshed ||
        Date.now() - (token.lastRefreshed as number) > 5 * 60 * 1000;

      if ((trigger === "update" || stale) && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              name: true,
              avatarUrl: true,
              role: true,
              orcidId: true,
              bannedAt: true,
              emailVerified: true,
            },
          });
          if (dbUser) {
            token.name = dbUser.name;
            token.picture = dbUser.avatarUrl;
            token.role = dbUser.role;
            token.orcidId = dbUser.orcidId;
            token.banned = !!dbUser.bannedAt;
            token.emailVerified = !!dbUser.emailVerified;
            token.lastRefreshed = Date.now();
          }
        } catch {
          // DB unreachable — keep existing token values
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
        session.user.role = token.role;
        session.user.orcidId = token.orcidId as string | undefined;
        session.user.banned = !!token.banned;
        (session.user as unknown as { emailVerified: boolean }).emailVerified =
          !!token.emailVerified;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) return null;

        // Reject banned users
        if (user.bannedAt) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
          orcidId: user.orcidId,
        };
      },
    }),
    ...(process.env.AUTH_ORCID_ID ? [orcidProvider()] : []),
  ],
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
