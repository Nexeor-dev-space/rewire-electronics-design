import { Logo } from "@/components/layout/logo";

/**
 * The logo above every auth card (sign in, register, password reset, verify
 * email). Auth pages have no header, so the logo links home as the way back
 * to the storefront.
 */
export function AuthLogo() {
  return (
    <div className="flex justify-center">
      <Logo priority />
    </div>
  );
}
