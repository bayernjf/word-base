import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createLogger } from '../lib/logger';
import {
  fetchActiveAnnouncements,
  fetchReadStateMap,
  mergeWithState,
  markAnnouncementRead as svcMarkRead,
  markBannerDismissed as svcDismissBanner,
  resolveApiPlatform,
} from '../lib/announcement/service';
import type {
  AnnouncementReadState,
  AnnouncementWithState,
} from '../lib/announcement/types';

const logger = createLogger('AnnouncementContext');

const POLL_INTERVAL_MS = 60 * 60 * 1000;
const REMOTE_FETCH_TIMEOUT_MS = 10_000;
const READ_STATE_TIMEOUT_MS = 2_000;

function resolveWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  label: string
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      logger.warn(`${label} timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        logger.warn(`${label} failed:`, err);
        resolve(fallback);
      }
    );
  });
}

interface AnnouncementContextValue {
  announcements: AnnouncementWithState[];
  loading: boolean;
  unreadCount: number;
  fetchAnnouncements: () => Promise<void>;
  markRead: (announcementId: string) => Promise<void>;
  dismissBanner: (announcementId: string) => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementContextValue | undefined>(undefined);

function countUnread(list: AnnouncementWithState[]): number {
  return list.filter((a) => !a.read).length;
}

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithState[]>([]);
  const [loading, setLoading] = useState(false);
  const apiPlatformRef = useRef<string>('');
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!apiPlatformRef.current) {
      apiPlatformRef.current = resolveApiPlatform();
    }
    if (inFlightRef.current) return inFlightRef.current;

    setLoading(true);
    inFlightRef.current = (async () => {
      try {
        const [remote, readMap] = await Promise.all([
          resolveWithTimeout(
            fetchActiveAnnouncements(apiPlatformRef.current),
            REMOTE_FETCH_TIMEOUT_MS,
            [],
            'fetchActiveAnnouncements'
          ),
          resolveWithTimeout(
            fetchReadStateMap(),
            READ_STATE_TIMEOUT_MS,
            new Map<string, AnnouncementReadState>(),
            'fetchReadStateMap'
          ),
        ]);
        const merged = mergeWithState(remote, readMap);
        setAnnouncements(merged);
      } catch (err) {
        logger.warn('fetchAnnouncements failed:', err);
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();
    return inFlightRef.current;
  }, []);

  const markRead = useCallback(async (announcementId: string) => {
    const ok = await svcMarkRead(announcementId);
    if (!ok) return;
    setAnnouncements((prev) => {
      const next = prev.map((a) =>
        a.id === announcementId ? { ...a, read: true } : a
      );
      return next;
    });
  }, []);

  const dismissBanner = useCallback(async (announcementId: string) => {
    const ok = await svcDismissBanner(announcementId);
    if (!ok) return;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, dismissed: true } : a))
    );
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      void fetchAnnouncements();
      timer = setInterval(() => void fetchAnnouncements(), POLL_INTERVAL_MS);
    };
    start();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [fetchAnnouncements]);

  const unreadCount = useMemo(() => countUnread(announcements), [announcements]);

  const value = useMemo<AnnouncementContextValue>(
    () => ({
      announcements,
      loading,
      unreadCount,
      fetchAnnouncements,
      markRead,
      dismissBanner,
    }),
    [announcements, loading, unreadCount, fetchAnnouncements, markRead, dismissBanner]
  );

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncements(): AnnouncementContextValue {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) {
    throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  }
  return ctx;
}
