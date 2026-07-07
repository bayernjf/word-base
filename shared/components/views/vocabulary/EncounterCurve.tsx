import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { AppLanguage, WordContext } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { formatDate, formatDateTime } from '../shared/helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

interface EncounterCurveProps {
  contexts: WordContext[];
  themeStyles: ThemeClasses;
  language: AppLanguage;
}

function contextTimestamp(ctx: WordContext): number {
  return ctx.timeAdded || ctx.addedDate || 0;
}

// 遇见历史可视化：根据每条语境的添加时间，展示遇见次数、首次/最近遇见、时间跨度与时间轴分布
export const EncounterCurve: React.FC<EncounterCurveProps> = ({ contexts, themeStyles, language }) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const stats = useMemo(() => {
    const times = contexts
      .map(contextTimestamp)
      .filter((value) => value > 0)
      .sort((a, b) => a - b);

    if (times.length === 0) return null;

    const first = times[0];
    const last = times[times.length - 1];
    const spanMs = last - first;
    const spanDays = Math.round(spanMs / DAY_MS);
    const range = spanMs || 1;

    // 时间轴上每个遇见点的真实归一化位置（0~100）
    const rawPercents = times.map((time) => ((time - first) / range) * 100);

    // 错开重叠点：保证相邻点至少间隔 minGap，两遍推挤后所有点都可见
    const minGap = Math.min(5, 100 / Math.max(1, times.length - 1));
    const points = [...rawPercents];
    // 从左往右推：每个点至少在前一个点右侧 minGap
    for (let i = 1; i < points.length; i += 1) {
      if (points[i] < points[i - 1] + minGap) {
        points[i] = points[i - 1] + minGap;
      }
    }
    // 若溢出右端，从右往左回推，把整体压回 [0,100]
    if (points[points.length - 1] > 100) {
      points[points.length - 1] = 100;
      for (let i = points.length - 2; i >= 0; i -= 1) {
        if (points[i] > points[i + 1] - minGap) {
          points[i] = points[i + 1] - minGap;
        }
      }
    }

    return { count: times.length, first, last, spanDays, points, times };
  }, [contexts]);

  if (!stats) return null;

  const accent = isGlass ? 'text-indigo-300' : 'text-[#2f805d]';
  const trackClass = isGlass ? 'bg-white/10' : 'bg-[#d9efd2]';
  const dotClass = isGlass ? 'bg-indigo-400 ring-slate-900/40' : 'bg-[#56a978] ring-white';
  const tooltipClass = isGlass
    ? 'bg-slate-800 text-white shadow-lg shadow-black/40'
    : 'bg-[#244235] text-white shadow-md shadow-[#8fb998]/30';
  const panelClass = isGlass
    ? 'border-white/10 bg-white/[0.03]'
    : 'border-[#bad8b7] bg-[#f3faef]';
  const labelClass = isGlass ? 'text-white/40' : 'text-[#6b7f6e]';

  const countLabel =
    stats.count === 1 ? t('wordDetail.encounterOnce') : t('wordDetail.encounterTimes', { count: stats.count });
  const spanLabel =
    stats.spanDays <= 0 ? t('wordDetail.encounterSameDay') : t('wordDetail.encounterDays', { days: stats.spanDays });

  return (
    <div className={`mb-5 rounded-xl border px-4 py-3 ${panelClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`w-3.5 h-3.5 ${accent}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
            {t('wordDetail.encounterTitle')}
          </span>
        </div>
        <span className={`text-xs font-bold ${accent}`}>{countLabel}</span>
      </div>

      {/* 时间轴：首次遇见到最近遇见，每个点是一次遇见 */}
      <div className="relative h-6 mb-3">
        <div className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full ${trackClass}`} />
        {stats.points.map((position, index) => (
          <div
            key={index}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex((cur) => (cur === index ? null : cur))}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 cursor-pointer transition-transform hover:scale-150 ${dotClass}`}
            style={{ left: `${position}%` }}
          />
        ))}
        {hoverIndex !== null && (
          <div
            className={`pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium ${tooltipClass}`}
            style={{ left: `${stats.points[hoverIndex]}%` }}
          >
            {formatDateTime(stats.times[hoverIndex])}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex flex-col">
          <span className={labelClass}>{t('wordDetail.encounterFirst')}</span>
          <span className={themeStyles.textSecondary}>{formatDate(stats.first)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className={labelClass}>{t('wordDetail.encounterSpan')}</span>
          <span className={themeStyles.textSecondary}>{spanLabel}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={labelClass}>{t('wordDetail.encounterLast')}</span>
          <span className={themeStyles.textSecondary}>{formatDate(stats.last)}</span>
        </div>
      </div>
    </div>
  );
};
