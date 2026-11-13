"use client";

import { useId, useState } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { useAssignTicket, useGetTicketAssignees } from "@/hooks/use-support";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TICKET_ASSIGNEE_ME } from "@/lib/support-tickets";
import type { TicketRow } from "@/types/support";

type AssignableTicket = Pick<TicketRow, "number" | "assigneeId" | "assigneeName">;

export function AssignTicketDialog({ ticket, onClose }: { ticket: AssignableTicket; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Assign ${ticket.number}`}
      description="The assigned staff member is emailed."
      className="max-w-md"
    >
      <AssignForm ticket={ticket} onClose={onClose} />
    </Dialog>
  );
}

function AssignForm({ ticket, onClose }: { ticket: AssignableTicket; onClose: () => void }) {
  const id = useId();
  const access = useModuleAccess(PERMISSIONS.support);
  const assignees = useGetTicketAssignees();
  const assign = useAssignTicket();
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? "");

  function save(value: string | null) {
    assign.mutate({ number: ticket.number, assigneeId: value }, { onSuccess: onClose });
  }

  const cancel = (
    <Button type="button" variant="outline" size="sm" onClick={onClose}>
      Cancel
    </Button>
  );
  const error = assign.isError && (
    <p role="alert" className="mr-auto text-sm text-danger">
      {assign.error.message}
    </p>
  );

  if (!access.delete) {
    const canTake = !ticket.assigneeId;
    return (
      <>
        <DialogBody>
          <p className="text-sm text-ink-secondary">
            {canTake
              ? "This ticket has nobody assigned. You can take it."
              : `This ticket is assigned to ${ticket.assigneeName}. Only someone with Full access can reassign it.`}
          </p>
        </DialogBody>
        <DialogFooter>
          {error}
          {cancel}
          {canTake && (
            <Button size="sm" loading={assign.isPending} onClick={() => save(TICKET_ASSIGNEE_ME)}>
              Assign to me
            </Button>
          )}
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogBody>
        <Field
          id={`${id}-assignee`}
          label="Staff member"
          hint="Lists Admins and Staff whose role has Support Tickets access. Give a role that access on the Roles screen to see more people."
        >
          <Select
            id={`${id}-assignee`}
            data-autofocus
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={assignees.isPending}
            className="h-11"
          >
            <option value="">Unassigned</option>
            {assignees.data?.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
              </option>
            ))}
          </Select>
        </Field>
        {assignees.isError && <p className="mt-3 text-sm text-danger">{assignees.error.message}</p>}
      </DialogBody>
      <DialogFooter>
        {error}
        {cancel}
        <Button
          size="sm"
          loading={assign.isPending}
          disabled={assigneeId === (ticket.assigneeId ?? "")}
          onClick={() => save(assigneeId || null)}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
