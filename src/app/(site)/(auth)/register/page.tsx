import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <RegisterForm next={next} />;
}
