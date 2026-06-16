import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.role) {
        session.user.role = token.role as typeof session.user.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password") ||
        nextUrl.pathname.startsWith("/verify-email");
      const isPublicRoute =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/papers/") ||
        nextUrl.pathname.startsWith("/profiles/") ||
        nextUrl.pathname.startsWith("/about") ||
        nextUrl.pathname.startsWith("/privacy") ||
        nextUrl.pathname.startsWith("/terms") ||
        nextUrl.pathname.startsWith("/api-docs") ||
        nextUrl.pathname.startsWith("/faq") ||
        nextUrl.pathname.startsWith("/editorial-board");
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (isPublicRoute || isApiRoute) {
        return true;
      }

      // Admin routes require ADMIN or MODERATOR role (role is stored in JWT from login)
      if (isAdminRoute) {
        if (!isLoggedIn) return false;
        const role = auth?.user?.role;
        if (role !== "ADMIN" && role !== "MODERATOR") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
};
