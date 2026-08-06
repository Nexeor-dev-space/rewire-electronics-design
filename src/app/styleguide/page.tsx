import type { Metadata } from "next";
import type { Product } from "@/types";
import { Container, Section, SectionEyebrow } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/ui/countdown";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

/* ---------- Demo data (mirrors future Payload shape) ---------- */

const placeholderImage = {
  id: "placeholder",
  url: "/images/placeholder-device.svg",
  alt: "Demo device on a dark stage",
  width: 640,
  height: 800,
};

const inSixDays = new Date(Date.now() + 6.5 * 86_400_000).toISOString();

const demoLive: Product = {
  id: "1",
  slug: "demo-live",
  name: "Titan Pro 15",
  variant: "Space Black · 1TB",
  brand: "Titan",
  category: "Laptops",
  condition: "pristine",
  price: 189_900,
  originalPrice: 269_900,
  currency: "USD",
  images: [placeholderImage],
  stock: 12,
  edition: { number: 14, of: 50 },
  drop: {
    id: "d1",
    slug: "drop-004",
    title: "The Studio Edit",
    edition: "Drop 004",
    status: "live",
    startsAt: new Date().toISOString(),
    endsAt: inSixDays,
  },
};

const demoUpcoming: Product = {
  ...demoLive,
  id: "2",
  slug: "demo-upcoming",
  name: "Aria Buds Max",
  brand: "Aria",
  variant: "Midnight · Wireless",
  condition: "excellent",
  price: 34_900,
  originalPrice: 54_900,
  edition: { of: 120 },
  drop: undefined,
};

const demoSoldOut: Product = {
  ...demoLive,
  id: "3",
  slug: "demo-sold-out",
  name: "Nova Tablet S9",
  brand: "Nova",
  variant: "Graphite · 512GB",
  condition: "good",
  price: 79_900,
  originalPrice: undefined,
  edition: undefined,
  drop: undefined,
  soldOut: true,
};

/* ---------- Page ---------- */

export default function StyleguidePage() {
  return (
    <div className="pt-32 md:pt-40 pb-24">
      <Container width="wide">
        <p className="eyebrow">Internal · Not indexed</p>
        <h1 className="mt-6 font-display text-display-xl">
          Design <em>system</em>
        </h1>
        <p className="mt-6 max-w-lg text-ink-secondary">
          Every token, voice and component in the Rewire foundation, on one
          page. If it isn&apos;t here, it isn&apos;t in the system.
        </p>
      </Container>

      {/* Typography */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="01">Typography</SectionEyebrow>
          <div className="space-y-10">
            <div>
              <p className="eyebrow mb-3">Display / Instrument Serif</p>
              <p className="font-display text-display-2xl">Rewired.</p>
              <p className="font-display text-display-lg mt-2">
                Second life. <em>First class.</em>
              </p>
            </div>
            <div>
              <p className="eyebrow mb-3">Body / Inter</p>
              <p className="max-w-xl text-lg text-ink">
                Every device is disassembled, measured, and rebuilt by hand.
              </p>
              <p className="max-w-xl mt-2 text-sm text-ink-secondary">
                Supporting text sits one step back in the secondary ink, never
                pure grey, never pure white.
              </p>
            </div>
            <div>
              <p className="eyebrow mb-3">Technical / IBM Plex Mono</p>
              <p className="font-mono text-sm tabular-nums tracking-wider text-ink-secondary">
                BATTERY 100% · CYCLES 12 · SN RW-2214-0047
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Color */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="02">Color</SectionEyebrow>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {[
              ["void", "bg-void border border-line"],
              ["surface", "bg-surface"],
              ["surface-2", "bg-surface-2"],
              ["surface-3", "bg-surface-3"],
              ["copper", "bg-copper"],
              ["live", "bg-live"],
              ["danger", "bg-danger"],
            ].map(([name, cls]) => (
              <div key={name}>
                <div className={`h-20 rounded-lg edge-light ${cls}`} />
                <p className="mt-2 font-mono text-xs text-ink-muted">{name}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Buttons */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="03">Buttons</SectionEyebrow>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Reserve yours</Button>
            <Button variant="accent">Notify me</Button>
            <Button variant="outline">View the drop</Button>
            <Button variant="ghost">Learn more</Button>
            <Button variant="link">Read the story</Button>
            <Button variant="primary" loading>
              Reserve yours
            </Button>
            <Button variant="primary" disabled>
              Sold out
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button size="sm" variant="outline">
              Small
            </Button>
            <Button size="md" variant="outline">
              Medium
            </Button>
            <Button size="lg" variant="outline">
              Large
            </Button>
          </div>
        </Container>
      </Section>

      {/* Badges */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="04">Badges</SectionEyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="outline">Laptops</Badge>
            <Badge variant="copper">No. 14 / 50</Badge>
            <Badge variant="live">Live now</Badge>
            <Badge variant="warn">3 left</Badge>
            <Badge variant="soldOut">Sold out</Badge>
          </div>
        </Container>
      </Section>

      {/* Countdown */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="05">Countdown</SectionEyebrow>
          <Countdown target={inSixDays} label="Drop ends in" />
          <div className="mt-8">
            <span className="glass inline-flex rounded-full px-3.5 py-2">
              <Countdown compact target={inSixDays} />
            </span>
          </div>
        </Container>
      </Section>

      {/* Cards */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="06">Cards</SectionEyebrow>
          <div className="grid gap-6 md:grid-cols-3">
            <Card padding="lg">
              <p className="eyebrow mb-3">Surface</p>
              <p className="text-sm text-ink-secondary">
                Default panel. Hairline border, edge light, no shadow.
              </p>
            </Card>
            <Card variant="sheen" floating interactive padding="lg">
              <p className="eyebrow mb-3">Sheen · floating · interactive</p>
              <p className="text-sm text-ink-secondary">
                Product stage treatment. Lifts on hover with the deep ambient
                shadow.
              </p>
            </Card>
            <div className="surface-gradient rounded-xl p-2">
              <Card variant="glass" padding="lg" className="h-full">
                <p className="eyebrow mb-3">Glass</p>
                <p className="text-sm text-ink-secondary">
                  Frosted panel — used only over imagery or gradients.
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      {/* Forms */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="07">Forms</SectionEyebrow>
          <div className="grid max-w-3xl gap-8 md:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="sg-email">Email</Label>
              <Input id="sg-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="sg-email-err">Email · invalid</Label>
              <Input
                id="sg-email-err"
                type="email"
                defaultValue="not-an-email"
                aria-invalid
                aria-describedby="sg-email-err-msg"
              />
              <FieldError id="sg-email-err-msg">
                Enter a valid email address.
              </FieldError>
            </div>
            <div className="space-y-2.5 md:col-span-2">
              <Label htmlFor="sg-message">Message</Label>
              <Textarea id="sg-message" placeholder="Tell us about your device…" />
            </div>
          </div>
        </Container>
      </Section>

      {/* Product cards */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="08">Product card</SectionEyebrow>
          <RevealGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <RevealItem>
              <ProductCard product={demoLive} priority />
            </RevealItem>
            <RevealItem>
              <ProductCard product={demoUpcoming} />
            </RevealItem>
            <RevealItem>
              <ProductCard product={demoSoldOut} />
            </RevealItem>
          </RevealGroup>
        </Container>
      </Section>

      {/* Loading states */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="09">Loading states</SectionEyebrow>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <ProductCardSkeleton />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-12 w-40 rounded-full" />
            </div>
          </div>
        </Container>
      </Section>

      {/* Motion */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="10">Motion</SectionEyebrow>
          <Reveal>
            <p className="max-w-xl font-display text-display-md">
              Blocks rise <em>28px</em> as they enter, on an expo curve, once.
            </p>
          </Reveal>
        </Container>
      </Section>
    </div>
  );
}
