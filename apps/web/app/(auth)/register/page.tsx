import { RegisterForm } from "@/components/auth/register-form";
import { isOrcidEnabled } from "@/lib/orcid";

export const metadata = {
  title: "Create Account - Academia Alexandria",
  description: "Create your Academia Alexandria account and start sharing research",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterForm showOrcid={isOrcidEnabled()} />;
}
