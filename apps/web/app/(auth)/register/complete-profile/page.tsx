import { redirect } from "next/navigation";
import { verifyOrcidRegistrationToken } from "@/lib/orcid-registration";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";

export const metadata = {
  title: "Complete Your Profile - Academia Alexandria",
  description: "Finish setting up your Academia Alexandria account",
  robots: { index: false, follow: false },
};

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/register");
  }

  const data = verifyOrcidRegistrationToken(token);
  if (!data) {
    redirect("/register");
  }

  return <CompleteProfileForm token={token} name={data.name} orcidId={data.orcidId} />;
}
