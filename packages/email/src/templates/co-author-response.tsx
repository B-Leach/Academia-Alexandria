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

interface CoAuthorResponseEmailProps {
  inviterName: string;
  paperTitle: string;
  inviteeName: string;
  accepted: boolean;
  paperUrl: string;
  unsubscribeUrl?: string;
  settingsUrl?: string;
}

export function CoAuthorResponseEmail({
  inviterName,
  paperTitle,
  inviteeName,
  accepted,
  paperUrl,
  unsubscribeUrl,
  settingsUrl,
}: CoAuthorResponseEmailProps) {
  const action = accepted ? "accepted" : "declined";

  return (
    <Html>
      <Head />
      <Preview>
        {inviteeName} {action} your co-author invitation
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {inviterName},</Text>
          <Text style={paragraph}>
            <strong>{inviteeName}</strong> has <strong>{action}</strong> your
            co-author invitation for the paper{" "}
            <strong>&quot;{paperTitle}&quot;</strong>.
          </Text>
          {accepted && (
            <Text style={paragraph}>
              They are now listed as a co-author on your paper.
            </Text>
          )}
          <Section style={buttonSection}>
            <Button style={button} href={paperUrl}>
              View Paper
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
