import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="admin-theme grid min-h-dvh place-items-center bg-void px-4 py-12">
      <SignInForm />
    </main>
  );
}
