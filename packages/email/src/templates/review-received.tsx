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

interface ReviewReceivedEmailProps {
  authorName: string;
  paperTitle: string;
  paperUrl: string;
  reviewerName: string;
  recommendation: string;
  unsubscribeUrl?: string;
  settingsUrl?: string;
}

export function ReviewReceivedEmail({
  authorName,
  paperTitle,
  paperUrl,
  reviewerName,
  recommendation,
  unsubscribeUrl,
  settingsUrl,
}: ReviewReceivedEmailProps) {
  const recommendationLabel =
    recommendation === "SOUND"
      ? "Sound"
      : recommendation === "NEEDS_REVISION"
        ? "Needs Revision"
        : "Unsound";

  return (
    <Html>
      <Head />
      <Preview>New review on &quot;{paperTitle}&quot;</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {authorName},</Text>
          <Text style={paragraph}>
            Your paper <strong>&quot;{paperTitle}&quot;</strong> received a new
            review from <strong>{reviewerName}</strong>.
          </Text>
          <Text style={paragraph}>
            Recommendation: <strong>{recommendationLabel}</strong>
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={paperUrl}>
              View Review
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
