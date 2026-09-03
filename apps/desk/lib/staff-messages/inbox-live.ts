/** CustomEvent für mäßig-live Eingang (Polling). */
export const STAFF_INBOX_LIVE_EVENT = "scrinium:staff-inbox-live";

export type StaffInboxLiveDetail = {
  /** true = neue ungelesene Nachricht (Ton bereits vom Notifier). */
  hasNewUnread: boolean;
  unreadCount: number;
};

export function dispatchStaffInboxLive(detail: StaffInboxLiveDetail) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<StaffInboxLiveDetail>(STAFF_INBOX_LIVE_EVENT, { detail })
  );
}

/** Poll-Interval je nach Tab-Fokus und ob wir auf dem Eingang sind. */
export function staffInboxPollIntervalMs(input: {
  documentHidden: boolean;
  onInboxPage: boolean;
}): number {
  if (input.documentHidden) {
    return 45_000;
  }
  if (input.onInboxPage) {
    return 6_000;
  }
  return 10_000;
}

export function isStaffInboxPath(pathname: string): boolean {
  return (
    pathname === "/eingang" ||
    pathname.endsWith("/eingang") ||
    pathname.includes("/eingang/")
  );
}
