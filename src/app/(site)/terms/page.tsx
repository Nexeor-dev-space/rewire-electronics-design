import { PolicyPage, policyMetadata } from "@/components/policy/policy-page";

export const generateMetadata = () => policyMetadata("terms-and-conditions");

export default function TermsPage() {
  return <PolicyPage slug="terms-and-conditions" />;
}
