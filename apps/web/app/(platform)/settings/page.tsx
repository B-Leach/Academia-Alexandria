import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { isStripeEnabled } from "@/lib/stripe";
import { isOrcidEnabled } from "@/lib/orcid";

export const metadata = {
  title: "Settings",
  description: "Manage your profile and account settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, allResearchAreas] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        honorific: true,
        bio: true,
        institution: true,
        rorId: true,
        avatarUrl: true,
        orcidId: true,
        notifyReviews: true,
        notifyComments: true,
        notifyEndorsements: true,
        notifyPaperStatus: true,
        notifyBounty: true,
        passwordHash: true,
        notifyInvitations: true,
        researchAreas: {
          select: { researchAreaId: true },
        },
      },
    }),
    db.researchArea.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const researchAreaIds = user.researchAreas.map((ra) => ra.researchAreaId);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your profile and account settings.
        </p>
      </div>

      <SettingsTabs
        user={{
          name: user.name,
          honorific: user.honorific,
          bio: user.bio,
          institution: user.institution,
          rorId: user.rorId,
          avatarUrl: user.avatarUrl,
          orcidId: user.orcidId,
          researchAreaIds,
          notifyReviews: user.notifyReviews,
          notifyComments: user.notifyComments,
          notifyEndorsements: user.notifyEndorsements,
          notifyPaperStatus: user.notifyPaperStatus,
          notifyBounty: user.notifyBounty,
          notifyInvitations: user.notifyInvitations,
        }}
        hasPassword={!!user.passwordHash}
        allResearchAreas={allResearchAreas}
        showPayments={isStripeEnabled()}
        showOrcid={isOrcidEnabled()}
      />
    </div>
  );
}
