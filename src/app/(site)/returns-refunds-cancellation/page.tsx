import { PolicyPage, policyMetadata } from "@/components/policy/policy-page";

export const generateMetadata = () => policyMetadata("returns-refunds-cancellation");

export default function ReturnsPage() {
  return <PolicyPage slug="returns-refunds-cancellation" />;
}
