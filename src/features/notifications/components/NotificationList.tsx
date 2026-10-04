"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteNotification, loadMoreNotifications, markNotificationsRead } from "../actions";
import { notificationStrings as s } from "../strings";
import type { NotificationItem, NotificationPage } from "../types";

import { NotificationRow } from "./NotificationRow";

// The viewer's notifications with mark-read, mark-all, delete and "load more".
export function NotificationList({ initialPage }: { initialPage: NotificationPage }) {
  const [items, setItems] = useState<NotificationItem[]>(initialPage.items);
  const [nextBefore, setNextBefore] = useState<string | null>(initialPage.nextBefore);
  const [pending, startTransition] = useTransition();
  const [loadingMore, startLoadMore] = useTransition();

  const hasUnread = items.some((item) => !item.read);

  // Opening a notification marks it read. The link navigates on its own; this runs alongside.
  function handleOpen(item: NotificationItem) {
    if (item.read) return;
    setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    startTransition(async () => {
      await markNotificationsRead({ ids: [item.id] });
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markNotificationsRead({});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems((current) => current.map((n) => ({ ...n, read: true })));
      toast.success(s.allRead);
    });
  }

  function handleDelete(item: NotificationItem) {
    startTransition(async () => {
      const result = await deleteNotification({ id: item.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems((current) => current.filter((n) => n.id !== item.id));
      toast.success(s.removed);
    });
  }

  function handleLoadMore() {
    if (!nextBefore) return;
    startLoadMore(async () => {
      const result = await loadMoreNotifications({ before: nextBefore });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems((current) => {
        const seen = new Set(current.map((n) => n.id));
        return [...current, ...result.data.items.filter((n) => !seen.has(n.id))];
      });
      setNextBefore(result.data.nextBefore);
    });
  }

  return (
    <div className="space-y-4">
      {hasUnread && (
        <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={handleMarkAll}>
          {pending ? s.marking : s.markAllRead}
        </Button>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} disabled={pending} onOpen={handleOpen} onDelete={handleDelete} />
        ))}
      </ul>
      {nextBefore && (
        <Button type="button" variant="outline" className="h-11 w-full" disabled={loadingMore} onClick={handleLoadMore}>
          {loadingMore ? s.loadingMore : s.loadMore}
        </Button>
      )}
    </div>
  );
}
