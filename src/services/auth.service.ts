import "server-only";

import type { z } from "zod";
import { ServiceError } from "@/lib/api/api-response";
import { appUrl } from "@/lib/app-url";
import { accountForSignUp, SHADOW_USER_WHERE, upgradeData } from "@/lib/auth/guest-user";
import { hashPassword } from "@/lib/auth/password";
import { consumeAuthToken, hashToken, issueAuthToken } from "@/lib/auth/tokens";
import { RESET_PASSWORD_PAGE_PATH, VERIFY_EMAIL_PAGE_PATH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendEmail, type SendEmailResult } from "@/lib/email/send-email";
import { resetPasswordMessage, verifyEmailMessage } from "@/lib/email/templates";
import type { SessionUser } from "@/types/auth";
import type { signUpSchema } from "@/validators/auth.validator";
import { emailTakenError } from "./user.service";

type SignUpData = z.output<typeof signUpSchema>;

interface Recipient {
  email: string;
  fullName: string;
}

const MESSAGE_LINK_INVALID = "This link has expired or was already used.";
const MESSAGE_SEND_FAILED = "We couldn't send the email. Please try again.";
const MESSAGE_ALREADY_VERIFIED = "Your email is already confirmed.";

const invalidLink = () =>
  new ServiceError("VALIDATION", MESSAGE_LINK_INVALID, 422, { token: [MESSAGE_LINK_INVALID] });

function tokenLink(path: string, token: string): Promise<string> {
  return appUrl(`${path}?${new URLSearchParams({ token })}`);
}

export async function sendVerificationEmail(recipient: Recipient, token: string): Promise<SendEmailResult> {
  const url = await tokenLink(VERIFY_EMAIL_PAGE_PATH, token);
  return sendEmail({ to: recipient.email, ...verifyEmailMessage({ name: recipient.fullName, url }) });
}

export async function registerCustomer(data: SignUpData) {
  const passwordHash = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: data.email },
      select: { id: true, isGuest: true, state: true, role: true },
    });
    const plan = accountForSignUp(existing);
    if (plan === "conflict") throw emailTakenError();

    let userId: string;
    if (existing && plan === "upgrade") {
      const { count } = await tx.user.updateMany({
        where: { id: existing.id, ...SHADOW_USER_WHERE },
        data: upgradeData(data, passwordHash),
      });
      if (count === 0) throw emailTakenError();
      userId = existing.id;
    } else {
      const created = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          role: "CUSTOMER",
          passwordHash,
          emailVerifiedAt: null,
        },
        select: { id: true },
      });
      userId = created.id;
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, sessionVersion: true },
    });
    const token = await issueAuthToken(tx, user.id, "VERIFY");
    return { user, token };
  });
}

export async function verifyEmail(raw: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const userId = await consumeAuthToken(tx, raw, "VERIFY");

    if (!userId) {
      const used = await tx.authToken.findUnique({
        where: { tokenHash: hashToken(raw) },
        select: { type: true, usedAt: true, user: { select: { state: true, emailVerifiedAt: true } } },
      });
      const alreadyVerified =
        used?.type === "VERIFY" &&
        used.usedAt !== null &&
        used.user.state === "ACTIVE" &&
        used.user.emailVerifiedAt !== null;
      if (!alreadyVerified) throw invalidLink();
      return;
    }

    const user = await tx.user.findUnique({ where: { id: userId }, select: { state: true } });
    if (user?.state !== "ACTIVE") throw invalidLink();

    await tx.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  });
}

export async function resendVerification(user: SessionUser): Promise<void> {
  if (user.emailVerified) {
    throw new ServiceError("CONFLICT", MESSAGE_ALREADY_VERIFIED, 409);
  }

  const token = await prisma.$transaction((tx) => issueAuthToken(tx, user.id, "VERIFY"));
  try {
    await sendVerificationEmail(user, token);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("resend verification email failed", error);
    throw new ServiceError("INTERNAL", MESSAGE_SEND_FAILED, 500);
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email, state: "ACTIVE", role: "CUSTOMER" },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) return;

  const token = await prisma.$transaction((tx) => issueAuthToken(tx, user.id, "RESET"));
  const url = await tokenLink(RESET_PASSWORD_PAGE_PATH, token);
  await sendEmail({ to: user.email, ...resetPasswordMessage({ name: user.fullName, url }) });
}

export async function resetPassword(raw: string, password: string): Promise<void> {
  const live = await prisma.authToken.findFirst({
    where: { tokenHash: hashToken(raw), type: "RESET", usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!live) throw invalidLink();

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const userId = await consumeAuthToken(tx, raw, "RESET");
    if (!userId) throw invalidLink();

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { state: true, role: true, emailVerifiedAt: true },
    });
    if (user?.state !== "ACTIVE" || user.role !== "CUSTOMER") throw invalidLink();

    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isGuest: false,
        sessionVersion: { increment: 1 },
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });
  });
}
