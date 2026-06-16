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

interface VerifyEmailEmailProps {
  verifyUrl: string;
  name: string;
}

export function VerifyEmailEmail({ verifyUrl, name }: VerifyEmailEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your Academia Alexandria email</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {name},</Text>
          <Text style={paragraph}>
            Please verify your email address to start reviewing and submitting
            papers on Academia Alexandria.
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={verifyUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={small}>
            This link expires in 24 hours. If you didn&apos;t create an account,
            you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Academia Alexandria</Text>
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
  margin: "0 0 20px",
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

const small = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#6b7280",
  margin: "0 0 20px",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};
