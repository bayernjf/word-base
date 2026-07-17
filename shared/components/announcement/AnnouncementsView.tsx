import React, { useCallback, useMemo, useState } from 'react';
import {
  Megaphone,
  RefreshCw,
  Loader2,
  ExternalLink,
  Pin,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { AppLanguage, ThemeType } from '../../types';
import { ThemeClasses } from '../ThemeStyles';
import { createTranslator } from '../../i18n';
import { getPlatform } from '../../platform';
import { useAnnouncements } from '../../context/AnnouncementContext';
import type { AnnouncementWithState } from '../../lib/announcement/types';
import { pickContent, pickTitle } from '../../lib/announcement/types';
import { getSeverityVisual } from '../../lib/announcement/config';
import { AnnouncementSeverityBadge } from './AnnouncementSeverityBadge';
import { severityIcon } from './severity-icons';

interface AnnouncementsViewProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

type Tab = 'all' | 'unread';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  themeStyles,
  language,
  onNavigate,
}) => {
  const t = createTranslator(language);
  const theme = themeStyles.name as ThemeType;
  const isGlass = theme === 'glass';
  const { announcements, loading, fetchAnnouncements, markRead } = useAnnouncements();
  const [tab, setTab] = useState<Tab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (tab === 'unread') return announcements.filter((a) => !a.read);
    return announcements;
  }, [announcements, tab]);

  const selected = useMemo(
    () => announcements.find((a) => a.id === selectedId) ?? null,
    [announcements, selectedId]
  );

  const handleOpen = useCallback(
    (item: AnnouncementWithState) => {
      setSelectedId(item.id);
      if (!item.read) void markRead(item.id);
    },
    [markRead]
  );

  const handleOpenAction = (url: string) => {
    void getPlatform().openUrl(url);
  };

  const primaryText = isGlass ? 'text-white' : 'text-[#1d3a2b]';
  const secondaryText = isGlass ? 'text-white/60' : 'text-[#556a5b]';
  const mutedText = isGlass ? 'text-white/40' : 'text-[#8a9c89]';
  const cardBg = isGlass
    ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
    : 'bg-[#fffdf7] border-[#bad8b7] hover:border-[#9fcea8]';
  const cardBgUnread = isGlass
    ? 'bg-white/[0.05] border-white/15 hover:border-indigo-400/40'
    : 'bg-[#fffdf7] border-[#84c796] hover:border-[#56a978]';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${primaryText}`}>
            {t('announcement.pageTitle' as any)}
          </h1>
          <p className={`text-sm mt-1 ${secondaryText}`}>
            {t('announcement.pageSubtitle' as any)}
          </p>
        </div>
        <button
          onClick={() => void fetchAnnouncements()}
          disabled={loading}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${mutedText} ${
            isGlass ? 'hover:text-white hover:bg-white/10' : 'hover:text-[#1d3a2b] hover:bg-[#e3f0dd]'
          }`}
          title={t('announcement.refresh' as any)}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div
        className={`flex items-center gap-1 p-1 rounded-xl w-fit ${
          isGlass ? 'bg-white/5' : 'bg-[#e3f0dd]'
        }`}
      >
        {([
          { id: 'all' as const, label: t('announcement.tabAll' as any) },
          { id: 'unread' as const, label: t('announcement.tabUnread' as any) },
        ]).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTab(opt.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === opt.id
                ? isGlass
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'bg-[#fffdf7] text-[#1d3a2b] shadow-sm'
                : isGlass
                  ? 'text-white/50 hover:text-white'
                  : 'text-[#8a9c89] hover:text-[#1d3a2b]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && announcements.length === 0 ? (
        <div
          className={`p-8 rounded-2xl border flex items-center justify-center gap-2 text-sm ${cardBg} ${secondaryText}`}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('announcement.loading' as any)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              isGlass ? 'bg-white/5' : 'bg-[#e3f0dd]'
            }`}
          >
            <Megaphone className={`w-7 h-7 ${mutedText}`} />
          </div>
          <h3 className={`text-sm font-medium ${secondaryText} mb-1`}>
            {tab === 'unread'
              ? t('announcement.noUnread' as any)
              : t('announcement.empty' as any)}
          </h3>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const config = getSeverityVisual(item.severity, theme);
            const Icon = severityIcon(item.severity);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpen(item)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  item.read ? cardBg : cardBgUnread
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.isPinned && (
                        <Pin className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" />
                      )}
                      <AnnouncementSeverityBadge
                        severity={item.severity}
                        theme={theme}
                        language={language}
                      />
                      {!item.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      )}
                      <span className={`text-[11px] ml-auto shrink-0 ${mutedText}`}>
                        {formatDate(item.publishAt)}
                      </span>
                    </div>
                    <h3
                      className={`text-sm truncate mb-1 ${
                        item.read
                          ? `font-medium ${secondaryText}`
                          : `font-semibold ${primaryText}`
                      }`}
                    >
                      {pickTitle(item, language)}
                    </h3>
                    <p className={`text-xs line-clamp-1 ${mutedText}`}>
                      {pickContent(item, language).split('\n')[0]}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{ backgroundColor: isGlass ? 'rgba(15,23,42,0.7)' : 'rgba(0,0,0,0.35)' }}
            onClick={() => setSelectedId(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-detail-title"
            className={`relative flex h-full w-full max-w-md flex-col border-l shadow-2xl ${
              isGlass ? 'bg-[#1a1a1c] border-white/10' : 'bg-[#fffdf7] border-[#bad8b7]'
            }`}
          >
            <div
              className={`flex items-center gap-2 border-b px-5 py-4 ${
                isGlass ? 'border-white/10' : 'border-[#bad8b7]'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={`rounded-lg p-1.5 transition-colors ${
                  isGlass
                    ? 'text-white/60 hover:bg-white/10 hover:text-white'
                    : 'text-[#8a9c89] hover:bg-[#e3f0dd] hover:text-[#1d3a2b]'
                }`}
                aria-label={t('announcement.back' as any)}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className={`text-sm font-medium ${secondaryText}`}>
                {t('announcement.detail' as any)}
              </span>
              {selected.read && (
                <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-500">
                  <Check className="h-3 w-3" />
                  {t('announcement.readMark' as any)}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-3 flex items-center gap-2">
                {selected.isPinned && (
                  <Pin className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
                )}
                <AnnouncementSeverityBadge
                  severity={selected.severity}
                  theme={theme}
                  language={language}
                />
                <span className={`ml-auto text-[11px] ${mutedText}`}>
                  {formatDate(selected.publishAt)}
                </span>
              </div>
              <h2
                id="announcement-detail-title"
                className={`mb-4 text-lg font-semibold ${primaryText}`}
              >
                {pickTitle(selected, language)}
              </h2>
              <p
                className={`whitespace-pre-wrap text-sm leading-7 ${
                  isGlass ? 'text-white/80' : 'text-[#2a4d3a]'
                }`}
              >
                {pickContent(selected, language)}
              </p>
            </div>

            {selected.actionUrl && (
              <div
                className={`border-t px-5 py-4 ${
                  isGlass ? 'border-white/10' : 'border-[#bad8b7]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleOpenAction(selected.actionUrl!)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:brightness-95 active:scale-[0.99]"
                  style={{
                    backgroundColor: getSeverityVisual(selected.severity, theme).color,
                    color: '#ffffff',
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('announcement.learnMore' as any)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className={`text-xs ${mutedText} hover:underline`}
      >
        ← {t('announcement.back' as any)}
      </button>
    </div>
  );
};
