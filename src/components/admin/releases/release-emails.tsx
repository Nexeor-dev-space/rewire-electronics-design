"use client";

import { Button } from "@/components/ui/button";
import { useSendReleaseTestEmails } from "@/hooks/use-release";
import { RELEASE_TEST_REMINDER_DEFAULTS_MINUTES } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { MESSAGE_TRIGGER_LABELS, reminderDueAt, reminderTrigger } from "@/lib/messaging";
import { listInWords, reminderLabel, testEmailsSummary } from "@/lib/releases";
import type { AdminReleaseDetail } from "@/types/release";

const WELCOME_WHEN = "When a waitlist place is confirmed";
const TEST_MODE_DEFAULTS = listInWords(RELEASE_TEST_REMINDER_DEFAULTS_MINUTES.map(String));

interface EmailRow {
  key: string;
  name: string;
  when: string;
}

function emailRows(release: AdminReleaseDetail): EmailRow[] {
  const opening = new Date(release.startsAt);
  return [
    { key: "welcome", name: MESSAGE_TRIGGER_LABELS.WAITLIST_WELCOME, when: WELCOME_WHEN },
    ...release.reminders.map((offset) => ({
      key: `reminder-${offset}`,
      name: `${MESSAGE_TRIGGER_LABELS[reminderTrigger(offset)]}, ${reminderLabel(offset)} before opening`,
      when: formatStoreDateTime(reminderDueAt(opening, offset).toISOString()),
    })),
    {
      key: "live",
      name: `${MESSAGE_TRIGGER_LABELS.DROP_LIVE}, at opening`,
      when: formatStoreDateTime(release.startsAt),
    },
  ];
}

export function ReleaseEmails({
  release,
  canSend,
  testMode,
}: {
  release: AdminReleaseDetail;
  canSend: boolean;
  testMode: boolean;
}) {
  const sendTest = useSendReleaseTestEmails();

  return (
    <div>
      {testMode && (
        <p className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-secondary">
          Test mode is on. New releases start with reminders {TEST_MODE_DEFAULTS} minutes before opening.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-2">
            <tr>
              <th className="eyebrow px-4 py-3 font-normal">Email</th>
              <th className="eyebrow px-4 py-3 font-normal">When</th>
            </tr>
          </thead>
          <tbody>
            {emailRows(release).map((row) => (
              <tr key={row.key} className="border-b border-line align-top last:border-b-0">
                <td className="px-4 py-3 text-ink">{row.name}</td>
                <td className="px-4 py-3 text-ink-secondary">{row.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-ink-secondary">
        Only confirmed waitlisters who chose email updates receive these. Reminders and the live email go out only
        while the release is published and not hidden.
      </p>

      {canSend && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {sendTest.isError && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {sendTest.error.message}
            </p>
          )}
          {sendTest.isSuccess && (
            <p role="status" className="mr-auto text-sm text-ink-secondary">
              {testEmailsSummary(sendTest.data)}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={sendTest.isPending}
            onClick={() => sendTest.mutate(release.id)}
          >
            Send test emails to me
          </Button>
        </div>
      )}
    </div>
  );
}
