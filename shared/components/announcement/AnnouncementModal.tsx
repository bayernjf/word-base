import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { AppLanguage, ThemeType } from '../../types';
import { createTranslator } from '../../i18n';
import { getPlatform } from '../../platform';
import type { AnnouncementWithState } from '../../lib/announcement/types';
import { pickContent, pickTitle } from '../../lib/announcement/types';
import { getSeverityVisual } from '../../lib/announcement/config';
import { severityIcon } from './severity-icons';
import { AnnouncementSeverityBadge } from './AnnouncementSeverityBadge';

interface AnnouncementModalProps {
  announcement: AnnouncementWithState;
  theme: ThemeType;
  language: AppLanguage;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  theme,
  language,
  onClose,
}) => {
  const t = createTranslator(language);
  const config = getSeverityVisual(announcement.severity, theme);
  const Icon = severityIcon(announcement.severity);
  const isGlass = theme === 'glass';
  const title = pickTitle(announcement, language);
  const content = pickContent(announcement, language);

  useEffect(() => {
    if (!announcement.isDismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [announcement.isDismissible, onClose]);

  const handleAction = () => {
    if (announcement.actionUrl) {
      void getPlatform().openUrl(announcement.actionUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          backgroundColor: isGlass ? 'rgba(15,23,42,0.75)' : 'rgba(0,0,0,0.45)',
        }}
        onClick={announcement.isDismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl ${isGlass ? 'bg-[#1a1a1c]' : 'bg-[#fffdf7]'}`}
        style={{ borderColor: config.borderColor }}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          }}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
              isGlass ? 'bg-white/[0.06]' : 'bg-white/70'
            }`}
          >
            <Icon className="h-5 w-5" style={{ color: config.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <AnnouncementSeverityBadge
                severity={announcement.severity}
                theme={theme}
                language={language}
              />
            </div>
            <h2
              id="announcement-modal-title"
              className={`truncate text-lg font-semibold ${isGlass ? 'text-white' : 'text-[#1d3a2b]'}`}
            >
              {title}
            </h2>
          </div>
          {announcement.isDismissible && (
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-lg p-2 transition-colors ${
                isGlass
                  ? 'text-white/60 hover:bg-white/10 hover:text-white'
                  : 'text-[#8a9c89] hover:bg-black/5 hover:text-[#1d3a2b]'
              }`}
              aria-label={t('announcement.close' as any)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-5">
          <p
            className={`whitespace-pre-wrap text-sm leading-7 ${
              isGlass ? 'text-white/80' : 'text-[#2a4d3a]'
            }`}
          >
            {content}
          </p>
        </div>

        <div
          className={`flex items-center justify-end gap-2 border-t px-5 py-3.5 ${
            isGlass ? 'border-white/10' : 'border-[#bad8b7]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isGlass
                ? 'text-white/80 hover:bg-white/10 hover:text-white'
                : 'text-[#2a4d3a] hover:bg-[#e3f0dd] hover:text-[#1d3a2b]'
            }`}
          >
            {t('announcement.gotIt' as any)}
          </button>
          {announcement.actionUrl && (
            <button
              type="button"
              onClick={handleAction}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:brightness-95 active:scale-[0.98]"
              style={{ backgroundColor: config.color, color: '#ffffff' }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('announcement.learnMore' as any)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
