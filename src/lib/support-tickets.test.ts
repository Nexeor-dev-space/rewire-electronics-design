import { describe, expect, it } from "vitest";
import {
  TICKET_STATUSES,
  isNewTicket,
  isReopen,
  needsStaffReply,
  nextTicketStatuses,
  statusAfterMessage,
} from "./support-tickets";

describe("nextTicketStatuses", () => {
  it("lets a resolved ticket be reopened or closed", () => {
    expect(nextTicketStatuses("RESOLVED")).toEqual(["OPEN", "CLOSED"]);
    expect(isReopen("RESOLVED", "OPEN")).toBe(true);
  });

  it("gives a closed ticket nowhere to go", () => {
    expect(nextTicketStatuses("CLOSED")).toEqual([]);
  });

  it("never lists a status as its own next step", () => {
    for (const status of TICKET_STATUSES) expect(nextTicketStatuses(status)).not.toContain(status);
  });
});

describe("statusAfterMessage", () => {
  it("starts work when staff answer an open ticket", () => {
    expect(statusAfterMessage("OPEN", "STAFF")).toBe("IN_PROGRESS");
    expect(statusAfterMessage("WAITING_FOR_CUSTOMER", "STAFF")).toBeNull();
  });

  it("resumes work when the customer answers a question", () => {
    expect(statusAfterMessage("WAITING_FOR_CUSTOMER", "CUSTOMER")).toBe("IN_PROGRESS");
  });

  it("reopens a resolved ticket when the customer writes again", () => {
    expect(statusAfterMessage("RESOLVED", "CUSTOMER")).toBe("OPEN");
  });
});

describe("needsStaffReply", () => {
  const customerAt = new Date("2026-01-02T10:00:00Z");
  const staffAt = new Date("2026-01-02T09:00:00Z");

  it("is true when the customer spoke last", () => {
    expect(needsStaffReply({ status: "OPEN", lastCustomerMessageAt: customerAt, lastStaffReplyAt: staffAt })).toBe(true);
    expect(needsStaffReply({ status: "OPEN", lastCustomerMessageAt: customerAt, lastStaffReplyAt: null })).toBe(true);
  });

  it("is false once staff answered, or the ticket is done", () => {
    expect(needsStaffReply({ status: "IN_PROGRESS", lastCustomerMessageAt: staffAt, lastStaffReplyAt: customerAt })).toBe(false);
    expect(needsStaffReply({ status: "RESOLVED", lastCustomerMessageAt: customerAt, lastStaffReplyAt: null })).toBe(false);
  });
});

describe("isNewTicket", () => {
  const now = new Date("2026-01-02T12:00:00Z");

  it("flags tickets from the last day only", () => {
    expect(isNewTicket(new Date("2026-01-02T00:00:00Z"), now)).toBe(true);
    expect(isNewTicket(new Date("2026-01-01T00:00:00Z"), now)).toBe(false);
  });
});
