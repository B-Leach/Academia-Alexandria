"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/validators/user";
import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  generateEmailVerificationToken,
} from "@/lib/tokens";
import {
  sendEmail,
  isEmailEnabled,
  PasswordResetEmail,
  VerifyEmailEmail,
} from "@academia-alexandria/email";
import { AuthError } from "next-auth";
import { notifyWelcome } from "@/lib/email-notifications";
import { rateLimitByIp, rateLimitByUser } from "@/lib/rate-limit";
import { requireUser } from "@/lib/require-user";
import { verifyOrcidRegistrationToken } from "@/lib/orcid-registration";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/utils";
import { z } from "zod";

const orcidProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  token: z.string().min(1),
});

export interface AuthActionResult {
  error?: string;
  success?: boolean;
}

async function sendVerificationEmail(
  email: string,
  name: string,
): Promise<void> {
  if (!isEmailEnabled()) return;
  try {
    const token = await generateEmailVerificationToken(email);
    const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Verify your email — Academia Alexandria",
      react: VerifyEmailEmail({ verifyUrl, name }),
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }
}

export async function register(formData: FormData): Promise<AuthActionResult> {
  const limited = await rateLimitByIp("auth");
  if (limited) return limited;

  const raw = {
    name: formData.get("name") as string,
    honorific: (formData.get("honorific") as string) || "",
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, honorific, email, password } = parsed.data;

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      honorific: honorific && honorific !== "none" ? honorific : null,
      email,
      passwordHash,
    },
  });

  notifyWelcome(user.id).catch(() => {});
  sendVerificationEmail(email, name).catch(() => {});

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Failed to sign in after registration" };
    }
    throw error;
  }

  return { success: true };
}

export async function completeOrcidRegistration(
  formData: FormData,
): Promise<AuthActionResult> {
  const limited = await rateLimitByIp("auth");
  if (limited) return limited;

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    token: formData.get("token") as string,
  };

  const parsed = orcidProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, token } = parsed.data;

  const data = verifyOrcidRegistrationToken(token);
  if (!data) {
    return {
      error:
        "Registration link expired. Please try signing in with ORCID again.",
    };
  }

  const existingEmail = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingEmail) {
    return { error: "An account with this email already exists" };
  }

  const existingOrcid = await db.user.findUnique({
    where: { orcidId: data.orcidId },
    select: { id: true },
  });
  if (existingOrcid) {
    return { error: "This ORCID iD is already linked to another account" };
  }

  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, orcidId: data.orcidId },
    });
    await tx.account.create({
      data: {
        userId: newUser.id,
        type: "oidc",
        provider: "orcid",
        providerAccountId: data.orcidId,
      },
    });
    return newUser;
  });

  notifyWelcome(user.id).catch(() => {});
  sendVerificationEmail(email, name).catch(() => {});

  // Redirect to ORCID sign-in — the Account record now exists,
  // so the OAuth flow will complete and sign the user in.
  redirect("/api/auth/signin/orcid?callbackUrl=/dashboard");
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthActionResult> {
  const limited = await rateLimitByIp("auth");
  if (limited) return limited;

  const raw = { email: formData.get("email") as string };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { email } = parsed.data;

  // Always return success to prevent email enumeration
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { success: true };
  }

  if (!isEmailEnabled()) {
    return {
      error: "Email is not configured. Please contact an administrator.",
    };
  }

  const token = await generatePasswordResetToken(email);
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your password — Academia Alexandria",
    react: PasswordResetEmail({ resetUrl }),
  });

  return { success: true };
}

export async function resetPassword(
  formData: FormData,
): Promise<AuthActionResult> {
  const limited = await rateLimitByIp("auth");
  if (limited) return limited;

  const raw = {
    token: formData.get("token") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { token, password } = parsed.data;

  const email = await verifyPasswordResetToken(token);
  if (!email) {
    return {
      error: "Invalid or expired reset link. Please request a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { email },
    data: { passwordHash },
  });

  await deletePasswordResetToken(token);

  return { success: true };
}

export async function resendVerificationEmail(): Promise<AuthActionResult> {
  const user = await requireUser();
  if (typeof user === "string") return { error: user };

  const limited = await rateLimitByUser("auth", user.id);
  if (limited) return limited;

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerified: true, name: true },
  });

  if (!dbUser) return { error: "User not found" };
  if (dbUser.emailVerified) return { error: "Email is already verified" };

  await sendVerificationEmail(dbUser.email!, dbUser.name ?? "Researcher");

  return { success: true };
}

export async function login(formData: FormData): Promise<AuthActionResult> {
  const limited = await rateLimitByIp("auth");
  if (limited) return limited;

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return { success: true };
}

export async function changePassword(
  formData: FormData,
): Promise<AuthActionResult> {
  const user = await requireUser();
  if (typeof user === "string") return { error: user };

  const limited = await rateLimitByUser("auth", user.id);
  if (limited) return limited;

  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmNewPassword: formData.get("confirmNewPassword") as string,
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser?.passwordHash) {
    return {
      error:
        "Your account uses ORCID sign-in and has no password. Use the forgot password page to set one.",
    };
  }

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    dbUser.passwordHash,
  );
  if (!valid) {
    return { error: "Current password is incorrect" };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}
