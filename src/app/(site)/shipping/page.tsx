import { PolicyPage, policyMetadata } from "@/components/policy/policy-page";

export const generateMetadata = () => policyMetadata("shipping");

export default function ShippingPage() {
  return <PolicyPage slug="shipping" />;
}
