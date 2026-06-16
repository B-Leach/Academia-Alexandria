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

interface BountyPayoutEmailProps {
  reviewerName: string;
  paperTitle: string;
  paperUrl: string;
  amountCents: number;
  isPending: boolean;
  settingsUrl: string;
  unsubscribeUrl?: string;
}

export function BountyPayoutEmail({
  reviewerName,
  paperTitle,
  paperUrl,
  amountCents,
  isPending,
  settingsUrl,
  unsubscribeUrl,
}: BountyPayoutEmailProps) {
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;

  return (
    <Html>
      <Head />
      <Preview>You earned {amountFormatted} for your review</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Academia Alexandria</Heading>
          <Hr style={hr} />
          <Text style={paragraph}>Hi {reviewerName},</Text>
          <Text style={paragraph}>
            You earned <strong>{amountFormatted}</strong> for reviewing{" "}
            <strong>&quot;{paperTitle}&quot;</strong>.
          </Text>
          {isPending ? (
            <>
              <Text style={paragraph}>
                Your payout is pending because you haven&apos;t connected a
                Stripe account yet. Connect Stripe in your settings to receive
                this and any future payouts.
              </Text>
              <Section style={buttonSection}>
                <Button style={button} href={settingsUrl}>
                  Connect Stripe
                </Button>
              </Section>
            </>
          ) : (
            <>
              <Text style={paragraph}>
                The payout has been transferred to your connected Stripe
                account.
              </Text>
              <Section style={buttonSection}>
                <Button style={button} href={paperUrl}>
                  View Paper
                </Button>
              </Section>
            </>
          )}
          {unsubscribeUrl ? (
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
