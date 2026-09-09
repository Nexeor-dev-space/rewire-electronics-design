import { PolicyPage, policyMetadata } from "@/components/policy/policy-page";

export const generateMetadata = () => policyMetadata("privacy-policy");

export default function PrivacyPage() {
  return <PolicyPage slug="privacy-policy" />;
}
