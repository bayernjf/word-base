import React from 'react';
import { X, ExternalLink, ChevronRight } from 'lucide-react';
import { AppLanguage, ThemeType } from '../../types';
import { createTranslator } from '../../i18n';
import { getPlatform } from '../../platform';
import type { AnnouncementWithState } from '../../lib/announcement/types';
import { pickContent, pickTitle } from '../../lib/announcement/types';
import { getSeverityVisual } from '../../lib/announcement/config';
import { severityIcon } from './severity-icons';

interface AnnouncementBannerProps {
  announcement: AnnouncementWithState;
  theme: ThemeType;
  language: AppLanguage;
  onDismiss: (id: string) => void;
  onOpenList: () => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  theme,
  language,
  onDismiss,
  onOpenList,
}) => {
  const t = createTranslator(language);
  const config = getSeverityVisual(announcement.severity, theme);
  const Icon = severityIcon(announcement.severity);
  const isGlass = theme === 'glass';
  const title = pickTitle(announcement, language);
  const contentFirstLine = pickContent(announcement, language).split('\n')[0];

  const handleOpen = () => {
    if (announcement.actionUrl) {
      void getPlatform().openUrl(announcement.actionUrl);
    } else {
      onOpenList();
    }
  };

  return (
    <div
      className="flex items-center gap-2.5 border-b px-4 sm:px-6 py-2 text-xs"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: config.color }} />
      <button
        type="button"
        onClick={handleOpen}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <span className="truncate font-semibold" style={{ color: config.color }}>
          {title}
        </span>
        <span
          className={`hidden truncate sm:inline ${
            isGlass ? 'text-white/60' : 'text-[#556a5b]'
          }`}
        >
          {contentFirstLine}
        </span>
        <ChevronRight
          className={`h-3 w-3 shrink-0 ${isGlass ? 'text-white/50' : 'text-[#8a9c89]'}`}
        />
      </button>
      {announcement.actionUrl && (
        <button
          type="button"
          onClick={handleOpen}
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
            isGlass ? 'hover:bg-white/10' : 'hover:bg-black/5'
          }`}
          style={{ color: config.color }}
          title={t('announcement.learnMore' as any)}
        >
          <ExternalLink className="h-3 w-3" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(announcement.id)}
        className={`shrink-0 rounded-md p-1 transition-colors ${
          isGlass
            ? 'text-white/50 hover:bg-white/10 hover:text-white'
            : 'text-[#8a9c89] hover:bg-black/5 hover:text-[#1d3a2b]'
        }`}
        aria-label={t('announcement.close' as any)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
