import { LoginForm } from "@/components/auth/login-form";
import { isOrcidEnabled } from "@/lib/orcid";

export const metadata = {
  title: "Sign In - Academia Alexandria",
  description: "Sign in to your Academia Alexandria account",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm showOrcid={isOrcidEnabled()} />;
}
