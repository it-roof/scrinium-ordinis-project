"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  dispatchStaffInboxLive,
  isStaffInboxPath,
  staffInboxPollIntervalMs,
} from "@/lib/staff-messages/inbox-live";

type InboxPulse = {
  unreadCount: number;
  latestUnreadId: string | null;
  latestUnreadAt: string | null;
};

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tones: { freq: number; start: number; dur: number; gain: number }[] = [
      { freq: 880, start: 0, dur: 0.12, gain: 0.08 },
      { freq: 1174.7, start: 0.1, dur: 0.18, gain: 0.07 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(
        tone.gain,
        now + tone.start + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + tone.start + tone.dur
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur + 0.02);
    }

    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // Autoplay-Block oder fehlende Audio-API — stillschweigend ignorieren.
  }
}

/**
 * App-weites Polling: Ton bei neuer Nachricht, Badge-Refresh, Event für den Eingang.
 */
export function StaffInboxSoundNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const baselineRef = useRef<{
    latestUnreadAt: string | null;
    unreadCount: number;
  } | null>(null);
  const audioUnlockedRef = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) {
        return;
      }
      audioUnlockedRef.current = true;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) {
          return;
        }
        const ctx = new AudioCtx();
        void ctx.resume().finally(() => {
          void ctx.close();
        });
      } catch {
        // ignore
      }
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const response = await fetch("/api/staff-messages/inbox-pulse", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok || cancelled) {
          return;
        }

        const pulse = (await response.json()) as InboxPulse;
        if (cancelled) {
          return;
        }

        const baseline = baselineRef.current;
        if (!baseline) {
          baselineRef.current = {
            latestUnreadAt: pulse.latestUnreadAt,
            unreadCount: pulse.unreadCount,
          };
          return;
        }

        const isNewer =
          Boolean(pulse.latestUnreadAt) &&
          (!baseline.latestUnreadAt ||
            pulse.latestUnreadAt! > baseline.latestUnreadAt);
        const countIncreased = pulse.unreadCount > baseline.unreadCount;
        const countChanged = pulse.unreadCount !== baseline.unreadCount;
        const hasNewUnread = isNewer || countIncreased;

        if (hasNewUnread) {
          playNotificationChime();
        }

        if (hasNewUnread || countChanged) {
          router.refresh();
          dispatchStaffInboxLive({
            hasNewUnread,
            unreadCount: pulse.unreadCount,
          });
        }

        baselineRef.current = {
          latestUnreadAt:
            pulse.latestUnreadAt &&
            (!baseline.latestUnreadAt ||
              pulse.latestUnreadAt > baseline.latestUnreadAt)
              ? pulse.latestUnreadAt
              : baseline.latestUnreadAt,
          unreadCount: pulse.unreadCount,
        };
      } catch {
        // Netz kurz weg — nächster Poll.
      }
    }

    const schedule = () => {
      window.clearTimeout(timer);
      const delay = staffInboxPollIntervalMs({
        documentHidden: document.visibilityState === "hidden",
        onInboxPage: isStaffInboxPath(pathnameRef.current),
      });
      timer = window.setTimeout(async () => {
        await poll();
        if (!cancelled) {
          schedule();
        }
      }, delay);
    };

    void poll().then(() => {
      if (!cancelled) {
        schedule();
      }
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void poll().then(() => {
          if (!cancelled) {
            schedule();
          }
        });
      } else {
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, pathname]);

  return null;
}
