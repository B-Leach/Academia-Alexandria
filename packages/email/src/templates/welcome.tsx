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

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Academia Alexandria</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {name},</Text>
          <Text style={paragraph}>
            Welcome to Academia Alexandria! We&apos;re glad to have you join our
            community of researchers and scholars.
          </Text>
          <Text style={paragraph}>
            Here you can publish your research, participate in peer review, and
            engage with the academic community — all for free.
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>
          <Text style={small}>
            Start by completing your profile and exploring papers in your field.
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
