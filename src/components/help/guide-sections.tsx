import { StepImage } from "./step-image";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { isRecordingUrl } from "@/lib/user-guides/recording";
import type { Guide, GuideSection } from "@/lib/user-guides/types";

/**
 * The body of a guide, shared by the Admin Panel and the storefront help
 * pages: a contents list, the screen recording and each section's numbered
 * steps with their screenshots. Server rendered, so it works in both.
 */

export function formatGuideDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Steps({ steps }: { steps: GuideSection["steps"] }) {
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-secondary">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs tabular-nums text-ink">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words">{step.text}</p>
            <StepImage
              src={step.imageId ? API_ENDPOINTS.media.detail(step.imageId) : (step.imageUrl ?? null)}
              alt={`Screenshot for step ${index + 1}`}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Notes({ notes }: { notes: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
      {notes.map((note, index) => (
        <li key={index}>{note}</li>
      ))}
    </ul>
  );
}

function Section({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="scroll-mt-24 rounded-xl border border-line bg-surface-2 p-5 sm:p-6"
    >
      <h2 id={`${section.id}-heading`} className="text-lg font-medium tracking-tight text-ink">
        {section.title}
      </h2>
      {section.intro && <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{section.intro}</p>}
      {section.steps.length > 0 && (
        <div className="mt-4">
          <Steps steps={section.steps} />
        </div>
      )}
      {section.notes.length > 0 && (
        <div className="mt-4">
          <Notes notes={section.notes} />
        </div>
      )}
    </section>
  );
}

function Recording({ url }: { url: string }) {
  return (
    <section aria-label="Screen recording" className="rounded-xl border border-line bg-surface-2 p-5 sm:p-6">
      <h2 className="text-lg font-medium tracking-tight text-ink">Watch it done</h2>
      <p className="mt-1 text-sm text-ink-secondary">A short silent recording of the steps below.</p>
      {isRecordingUrl(url) && (
        <video src={url} controls muted preload="metadata" className="mt-4 w-full max-w-2xl rounded-lg border border-line" />
      )}
    </section>
  );
}

/** The contents list and the sections, with the last updated date. */
export function GuideBody({ guide }: { guide: Guide }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Contents" className="rounded-xl border border-line bg-surface-2 p-4 lg:sticky lg:top-6">
        <p className="eyebrow">Contents</p>
        <ol className="mt-3 flex flex-col gap-1.5 text-sm">
          {guide.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-md px-2 py-1 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-muted">
          Last updated {formatGuideDate(guide.updatedAt)}
        </p>
      </nav>

      <div className="flex min-w-0 flex-col gap-6">
        {guide.recordingUrl && <Recording url={guide.recordingUrl} />}
        {guide.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
