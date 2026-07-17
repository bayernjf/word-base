import React from 'react';
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import { AppLanguage, ThemeType } from '../../types';
import { createTranslator } from '../../i18n';
import type { AnnouncementSeverity } from '../../lib/announcement/types';
import { getSeverityVisual } from '../../lib/announcement/config';

interface SeverityBadgeProps {
  severity: AnnouncementSeverity;
  theme: ThemeType;
  language: AppLanguage;
  className?: string;
}

const ICONS: Record<AnnouncementSeverity, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

export const AnnouncementSeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  theme,
  language,
  className,
}) => {
  const t = createTranslator(language);
  const config = getSeverityVisual(severity, theme);
  const Icon = ICONS[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${className ?? ''}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <Icon className="w-3 h-3" />
      {t(config.labelKey as any)}
    </span>
  );
};
