"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { SecurityForm } from "@/components/settings/security-form";
import { StripeConnectCard } from "@/components/settings/stripe-connect-card";
import { OrcidConnectCard } from "@/components/settings/orcid-connect-card";
import { ApiKeysForm } from "@/components/settings/api-keys-form";
import { WebhooksForm } from "@/components/settings/webhooks-form";

interface ResearchArea {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface SettingsTabsProps {
  user: {
    name: string;
    honorific: string | null;
    bio: string | null;
    institution: string | null;
    rorId: string | null;
    avatarUrl: string | null;
    orcidId: string | null;
    researchAreaIds: string[];
    notifyReviews: boolean;
    notifyComments: boolean;
    notifyEndorsements: boolean;
    notifyPaperStatus: boolean;
    notifyBounty: boolean;
    notifyInvitations: boolean;
  };
  hasPassword: boolean;
  allResearchAreas: ResearchArea[];
  showPayments: boolean;
  showOrcid: boolean;
}

export function SettingsTabs({
  user,
  hasPassword,
  allResearchAreas,
  showPayments,
  showOrcid,
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {showOrcid && <TabsTrigger value="accounts">Accounts</TabsTrigger>}
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        {showPayments && <TabsTrigger value="payments">Payments</TabsTrigger>}
        <TabsTrigger value="developer">Developer</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              This information will be displayed on your public profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              user={{
                name: user.name,
                honorific: user.honorific,
                bio: user.bio,
                institution: user.institution,
                rorId: user.rorId,
                avatarUrl: user.avatarUrl,
                researchAreaIds: user.researchAreaIds,
              }}
              allResearchAreas={allResearchAreas}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {showOrcid && (
        <TabsContent value="accounts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Accounts</CardTitle>
              <CardDescription>
                Connect external accounts to verify your researcher identity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrcidConnectCard orcidId={user.orcidId} />
            </CardContent>
          </Card>
        </TabsContent>
      )}

      <TabsContent value="notifications" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Choose which email notifications you want to receive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm
              preferences={{
                notifyReviews: user.notifyReviews,
                notifyComments: user.notifyComments,
                notifyEndorsements: user.notifyEndorsements,
                notifyPaperStatus: user.notifyPaperStatus,
                notifyBounty: user.notifyBounty,
                notifyInvitations: user.notifyInvitations,
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecurityForm hasPassword={hasPassword} />
          </CardContent>
        </Card>
      </TabsContent>

      {showPayments && (
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                Connect Stripe to receive bounty payouts for peer reviews.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeConnectCard />
            </CardContent>
          </Card>
        </TabsContent>
      )}
      <TabsContent value="developer" className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Create API keys to access the write API programmatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeysForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Receive HTTP POST notifications when events occur on your papers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhooksForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
