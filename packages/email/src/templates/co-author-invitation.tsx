import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { UnsubscribeFooter } from "./unsubscribe-footer";

interface CoAuthorInvitationEmailProps {
  inviteeName: string;
  paperTitle: string;
  inviterName: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  settingsUrl?: string;
}

export function CoAuthorInvitationEmail({
  inviteeName,
  paperTitle,
  inviterName,
  dashboardUrl,
  unsubscribeUrl,
  settingsUrl,
}: CoAuthorInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;ve been invited as co-author on &quot;{paperTitle}&quot;
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {inviteeName},</Text>
          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you as a co-author on the
            paper <strong>&quot;{paperTitle}&quot;</strong>.
          </Text>
          <Text style={paragraph}>
            You can accept or decline this invitation from your dashboard.
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              View Invitation
            </Button>
          </Section>
          {unsubscribeUrl && settingsUrl ? (
            <UnsubscribeFooter
              unsubscribeUrl={unsubscribeUrl}
              settingsUrl={settingsUrl}
            />
          ) : (
            <>
              <Hr style={hr} />
              <Text style={footer}>Academia Alexandria</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "480px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "20px",
  fontWeight: "600" as const,
  color: "#111827",
  textAlign: "center" as const,
  margin: "0 0 20px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "500" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  display: "inline-block",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};
