import { timeAgo } from "@/lib/utils/dates";

import { safeNotificationLink } from "./schemas";
import type { NotificationItem } from "./types";

export const NOTIFICATION_COLUMNS = "id, type, title, body, link, read_at, created_at";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function toNotificationItem(row: NotificationRow, now: Date = new Date()): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: safeNotificationLink(row.link),
    read: row.read_at !== null,
    createdAt: row.created_at,
    timeLabel: timeAgo(row.created_at, now),
  };
}
