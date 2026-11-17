import { AdminPage } from "@/components/admin/admin-page";
import type { GuideGroup, GuideSection, UserGuide } from "@/lib/user-guides/types";

/** A numbered list of steps. */
function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-secondary">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs tabular-nums text-ink">
            {index + 1}
          </span>
          <span className="min-w-0 break-words">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Notes({ notes }: { notes: string[] }) {
  return (
    <div className="mt-5 rounded-lg border border-line bg-surface p-4">
      <p className="eyebrow">Good to know</p>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
        {notes.map((note, index) => (
          <li key={index}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

function Group({ group }: { group: GuideGroup }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="mb-3 text-sm font-medium text-ink">{group.title}</h3>
      <Steps steps={group.steps} />
      {group.notes && <Notes notes={group.notes} />}
    </div>
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
      {section.intro && (
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{section.intro}</p>
      )}

      <div className="mt-4">
        {section.steps && <Steps steps={section.steps} />}
        {section.groups?.map((group) => <Group key={group.title} group={group} />)}
        {section.table && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="bg-surface">
                <tr>
                  {section.table.head.map((cell) => (
                    <th key={cell} scope="col" className="eyebrow px-4 py-2.5 font-normal">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row, index) => (
                  <tr key={index} className="border-t border-line">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={
                          cellIndex === 0
                            ? "px-4 py-2.5 font-medium text-ink"
                            : "px-4 py-2.5 text-ink-secondary"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {section.notes && <Notes notes={section.notes} />}
    </section>
  );
}

/** A guide as an admin page: contents list on the left from `lg`, sections beside it. */
export function GuideView({ guide }: { guide: UserGuide }) {
  return (
    <AdminPage title={guide.title} description={guide.description}>
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Contents"
          className="rounded-xl border border-line bg-surface-2 p-4 lg:sticky lg:top-6"
        >
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
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {guide.sections.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </div>
      </div>
    </AdminPage>
  );
}
