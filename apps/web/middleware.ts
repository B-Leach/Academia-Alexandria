import NextAuth, { type NextAuthResult } from "next-auth";
import { authConfig } from "@/lib/auth.config";

const middleware: NextAuthResult["auth"] = NextAuth(authConfig).auth;
export default middleware;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
