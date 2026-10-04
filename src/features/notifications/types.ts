export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  // In-app path (always starts with "/") or null. Anything else is dropped before it reaches the UI.
  link: string | null;
  read: boolean;
  createdAt: string;
  // "today", "3 days ago"… computed on the server.
  timeLabel: string;
};

export type NotificationPage = {
  items: NotificationItem[];
  // created_at of the last item, to load the next page; null when there are no more.
  nextBefore: string | null;
};

export type NotificationPreferences = {
  emailEnabled: boolean;
  mutedTypes: string[];
  whatsappOptIn: boolean;
};
