import { RESET_TOKEN_TTL_SECONDS, VERIFY_TOKEN_TTL_SECONDS } from "@/lib/constants";
import { siteConfig } from "@/lib/site";
import type { EmailContent } from "./email-outcome";

interface LinkEmailInput {
  name: string;
  url: string;
}

const SECONDS_PER_HOUR = 60 * 60;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function hoursLabel(seconds: number): string {
  const hours = Math.round(seconds / SECONDS_PER_HOUR);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function linkEmail(
  subject: string,
  { name, url }: LinkEmailInput,
  intro: string,
  action: string,
  outro: string,
): EmailContent {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  const html = [
    `<p>Hi ${safeName},</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    `<p><a href="${safeUrl}">${escapeHtml(action)}</a></p>`,
    `<p>If that doesn't open, paste this address into your browser:<br>${safeUrl}</p>`,
    `<p>${escapeHtml(outro)}</p>`,
    `<p>${escapeHtml(siteConfig.name)}</p>`,
  ].join("\n");
  const text = [
    `Hi ${name},`,
    "",
    intro,
    "",
    `${action}: ${url}`,
    "",
    outro,
    "",
    siteConfig.name,
  ].join("\n");
  return { subject, html, text };
}

export function verifyEmailMessage(input: LinkEmailInput): EmailContent {
  return linkEmail(
    `Confirm your email for ${siteConfig.name}`,
    input,
    `Thanks for creating a ${siteConfig.name} account. Please confirm this is your email address.`,
    "Confirm my email",
    `This link expires in ${hoursLabel(VERIFY_TOKEN_TTL_SECONDS)}. If you didn't create an account, you can ignore this email.`,
  );
}

export function resetPasswordMessage(input: LinkEmailInput): EmailContent {
  return linkEmail(
    `Reset your ${siteConfig.name} password`,
    input,
    "We received a request to reset the password for your account.",
    "Choose a new password",
    `This link expires in ${hoursLabel(RESET_TOKEN_TTL_SECONDS)} and can be used once. If you didn't ask to reset your password, you can ignore this email.`,
  );
}
