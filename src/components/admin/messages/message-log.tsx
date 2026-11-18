"use client";

import { useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { Input, Select } from "@/components/ui/input";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import {
  MESSAGE_CHANNELS,
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_STATUSES,
  MESSAGE_STATUS_LABELS,
  MESSAGE_TRIGGERS,
  MESSAGE_TRIGGER_LABELS,
  type MessageChannel,
  type MessageStatus,
  type MessageTrigger,
} from "@/lib/messaging";
import { MessageList } from "./message-list";

/**
 * Marketing, Marketing Messages: every automated email and WhatsApp message
 * with its outcome. Filter by Failed or Skipped to find what did not go out
 * and why.
 */
export function MessageLog() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MessageStatus | "">("");
  const [channel, setChannel] = useState<MessageChannel | "">("");
  const [trigger, setTrigger] = useState<MessageTrigger | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  return (
    <AdminPage
      title="Marketing Messages"
      description="Every automated email and WhatsApp message, and whether it was sent, failed or skipped."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by email, phone, subject or record"
          aria-label="Search messages"
          className="h-10 sm:w-80"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as MessageStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-40"
        >
          <option value="">All statuses</option>
          {MESSAGE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {MESSAGE_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={channel}
          onChange={(event) => {
            setChannel(event.target.value as MessageChannel | "");
            setPage(1);
          }}
          aria-label="Filter by channel"
          className="h-10 sm:w-40"
        >
          <option value="">All channels</option>
          {MESSAGE_CHANNELS.map((value) => (
            <option key={value} value={value}>
              {MESSAGE_CHANNEL_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={trigger}
          onChange={(event) => {
            setTrigger(event.target.value as MessageTrigger | "");
            setPage(1);
          }}
          aria-label="Filter by message type"
          className="h-10 sm:w-60"
        >
          <option value="">All message types</option>
          {MESSAGE_TRIGGERS.map((value) => (
            <option key={value} value={value}>
              {MESSAGE_TRIGGER_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      <MessageList
        filters={{
          page,
          search: search || undefined,
          status: status || undefined,
          channel: channel || undefined,
          trigger: trigger || undefined,
        }}
        filtered={Boolean(search || status || channel || trigger)}
        onPageChange={setPage}
      />
    </AdminPage>
  );
}
