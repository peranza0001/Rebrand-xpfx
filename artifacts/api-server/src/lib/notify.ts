/**
 * Cross-cutting in-app + email notification helpers. Routes call these
 * instead of pushing into the in-memory stores directly so we can enforce
 * the admin's per-action email toggle in `notificationSettings`.
 *
 * Emails are stubbed via lib/email.ts (no real SMTP).
 */
import {
  adminAlerts,
  newId,
  NOW,
  notificationSettings,
  userNotifications,
  users,
  type AdminAlertData,
  type NotificationData,
  type NotificationSettingsData,
} from "./store";
import { adminNotifyEmail, sendEmail } from "./email";
import { persistNotification } from "./db-persist";

const MAX_PER_USER = 200;
const MAX_ALERTS = 200;

export type NotifyKind = keyof NotificationSettingsData;

interface NotifyUserArgs {
  userId: string;
  kind: NotifyKind | string;
  /**
   * Toggle key in NotificationSettings. When omitted, no email is sent
   * (in-app only). When provided, the email is only sent if that toggle
   * is enabled.
   */
  emailToggle?: NotifyKind;
  title: string;
  body: string;
  link?: string | null;
}

export function notifyUser(args: NotifyUserArgs): NotificationData {
  const note: NotificationData = {
    id: newId("notif"),
    userId: args.userId,
    kind: String(args.kind),
    title: args.title,
    body: args.body,
    read: false,
    link: args.link ?? null,
    createdAt: NOW(),
  };
  const list = userNotifications.get(args.userId) ?? [];
  list.unshift(note);
  if (list.length > MAX_PER_USER) list.length = MAX_PER_USER;
  userNotifications.set(args.userId, list);
  void persistNotification(note.id, args.userId, {
    type: note.kind,
    title: note.title,
    message: note.body,
    read: note.read,
    link: note.link,
    createdAt: note.createdAt,
  });

  if (args.emailToggle && notificationSettings[args.emailToggle]) {
    const stored = users.get(args.userId);
    if (stored?.user.email) {
      void sendEmail({
        to: stored.user.email,
        subject: args.title,
        body: args.body,
        kind: String(args.kind),
      }).catch(() => {});
    }
  }
  return note;
}

interface AdminAlertArgs {
  kind: string;
  title: string;
  body: string;
  userId?: string | null;
  userEmail?: string | null;
  severity?: AdminAlertData["severity"];
  /** Admin-portal deep-link the alert should navigate to. */
  linkUrl?: string | null;
  /** When true, also send a stub email to ADMIN_NOTIFY_EMAIL. */
  email?: boolean;
}

export function pushAdminAlert(args: AdminAlertArgs): AdminAlertData {
  const alert: AdminAlertData = {
    id: newId("alert"),
    kind: args.kind,
    title: args.title,
    body: args.body,
    userId: args.userId ?? null,
    userEmail: args.userEmail ?? null,
    severity: args.severity ?? "info",
    read: false,
    createdAt: NOW(),
    linkUrl: args.linkUrl ?? (args.userId ? `/users/${args.userId}` : null),
  };
  adminAlerts.unshift(alert);
  if (adminAlerts.length > MAX_ALERTS) adminAlerts.length = MAX_ALERTS;
  if (args.email) {
    void sendEmail({
      to: adminNotifyEmail(),
      subject: `[ADMIN] ${alert.title}`,
      body: alert.body,
      kind: `admin.${alert.kind}`,
    }).catch(() => {});
  }
  return alert;
}
