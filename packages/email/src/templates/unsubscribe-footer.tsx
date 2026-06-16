import { Hr, Link, Text } from "@react-email/components";

interface UnsubscribeFooterProps {
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function UnsubscribeFooter({
  unsubscribeUrl,
  settingsUrl,
}: UnsubscribeFooterProps) {
  return (
    <>
      <Hr style={hr} />
      <Text style={footerText}>
        <Link href={unsubscribeUrl} style={link}>
          Unsubscribe
        </Link>{" "}
        from these notifications, or manage all{" "}
        <Link href={settingsUrl} style={link}>
          notification settings
        </Link>
        .
      </Text>
      <Text style={footerText}>Academia Alexandria</Text>
    </>
  );
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const link = {
  color: "#6b7280",
  textDecoration: "underline",
};
