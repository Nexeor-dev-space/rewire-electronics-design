import { Container, Section } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";

/**
 * Placeholder route — the homepage will be designed in a later phase.
 * This exists only so the foundation runs; it is not the hero.
 */
export default function Home() {
  return (
    <Section className="flex min-h-[70vh] items-end pt-40">
      <Container width="wide" className="pb-8">
        <Badge variant="copper">Foundation · v0.1</Badge>
        <h1 className="mt-8 max-w-4xl font-display text-display-xl">
          The stage is built.
          <br />
          <em className="text-ink-muted">The show comes next.</em>
        </h1>
        <p className="mt-8 max-w-md text-sm leading-relaxed text-ink-secondary">
          Design system, tokens, layout chrome and component library are in
          place. Visit{" "}
          <a
            href="/styleguide"
            className="text-copper underline underline-offset-4"
          >
            /styleguide
          </a>{" "}
          to review the foundation.
        </p>
      </Container>
    </Section>
  );
}
