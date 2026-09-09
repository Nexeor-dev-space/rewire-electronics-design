import { PolicyPage, policyMetadata } from "@/components/policy/policy-page";

export const generateMetadata = () => policyMetadata("warranty");

export default function WarrantyPage() {
  return <PolicyPage slug="warranty" />;
}
