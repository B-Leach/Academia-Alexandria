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

interface EndorsementReceivedEmailProps {
  authorName: string;
  paperTitle: string;
  paperUrl: string;
  endorserName: string;
  endorserReputation: number;
  statement?: string;
  unsubscribeUrl?: string;
  settingsUrl?: string;
}

export function EndorsementReceivedEmail({
  authorName,
  paperTitle,
  paperUrl,
  endorserName,
  endorserReputation,
  statement,
  unsubscribeUrl,
  settingsUrl,
}: EndorsementReceivedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your paper was endorsed by {endorserName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {authorName},</Text>
          <Text style={paragraph}>
            <strong>{endorserName}</strong> ({endorserReputation} reputation)
            endorsed your paper <strong>&quot;{paperTitle}&quot;</strong>.
          </Text>
          {statement && <Text style={quote}>&quot;{statement}&quot;</Text>}
          <Section style={buttonSection}>
            <Button style={button} href={paperUrl}>
              View Endorsement
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

const quote = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#6b7280",
  borderLeft: "3px solid #e5e7eb",
  paddingLeft: "12px",
  margin: "0 0 16px",
  fontStyle: "italic" as const,
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
