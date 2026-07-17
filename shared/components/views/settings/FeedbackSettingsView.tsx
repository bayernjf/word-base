import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Send, Loader2, History, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, FileText, RefreshCw, Trash2, Eye, EyeOff,
  Lightbulb, HelpCircle, Bug,
} from 'lucide-react';
import { ThemeClasses } from '../../ThemeStyles';
import { getPlatform } from '../../../platform';
import { createTranslator } from '../../../i18n';
import type { AppLanguage } from '../../../types';
import {
  FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_I18N_KEYS,
  FEEDBACK_STATUS_I18N_KEYS, FEEDBACK_STATUS_STYLES,
  FEEDBACK_LIMITS, FEEDBACK_LOG_TIME_OPTIONS,
  isFeedbackCategory, isFeedbackStatus,
  type FeedbackCategory, type FeedbackHistoryItem, type FeedbackLogData,
} from '../../../lib/feedback';
import { submitFeedback, fetchFeedbackHistory } from '../../../lib/feedbackService';
import { collectFrontendLogs, mergeLogs } from '../../../lib/feedbackLogger';

interface FeedbackSettingsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  userId: string | null;
  accessToken: string | null;
  onSignInClick?: () => void;
}

type SubmitState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'success' }
  | { phase: 'error'; errorKey: string; errorOptions?: { count: number } };

type LogFetchState =
  | { phase: 'idle' }
  | { phase: 'fetching' }
  | { phase: 'fetched'; data: FeedbackLogData }
  | { phase: 'error' };

const CATEGORY_ICONS: Record<FeedbackCategory, React.FC<{ className?: string }>> = {
  bug: Bug,
  feature: Lightbulb,
  content_error: FileText,
  question: HelpCircle,
  other: MessageSquare,
};

export const FeedbackSettingsView: React.FC<FeedbackSettingsProps> = ({
  themeStyles, language, userId, accessToken, onSignInClick,
}) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';

  const cardBase = isGlass
    ? 'bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl'
    : 'bg-[#fffdf7] border border-[#bad8b7] rounded-3xl shadow-sm shadow-[#8fb998]/15';
  const iconWrap = isGlass
    ? 'bg-white/10 text-indigo-300'
    : 'bg-[#e8f2e1] text-[#336f4e]';
  const mutedText = isGlass ? 'text-white/50' : 'text-[#7a8f7f]';
  const bodyText = isGlass ? 'text-white/70' : 'text-[#4a6350]';
  const headingText = themeStyles.textPrimary;
  const btnSecondary = themeStyles.btnSecondary;
  const btnPrimary = isGlass
    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
    : 'bg-[#56a978] hover:bg-[#3f8e5e] text-white';
  const inputBase = isGlass
    ? 'bg-white/5 border border-white/10 text-white placeholder-white/30'
    : 'bg-[#f4f9ef] border border-[#bad8b7] text-[#244235] placeholder-[#9ab3a0]';

  // 表单状态
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: 'idle' });

  // 日志状态
  const [logMinutes, setLogMinutes] = useState<number>(5);
  const [logFetchState, setLogFetchState] = useState<LogFetchState>({ phase: 'idle' });
  const [showLogPreview, setShowLogPreview] = useState(false);

  // 历史状态
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<FeedbackHistoryItem[]>([]);
  const historyLoadedRef = useRef(false);

  const platform = getPlatform();
  const supportsPlatformLogs = typeof platform.getRecentLogs === 'function';

  // =============================================
  // 日志获取
  // =============================================
  const handleFetchLogs = useCallback(async () => {
    setLogFetchState({ phase: 'fetching' });
    try {
      let platformLog: FeedbackLogData | null = null;
      if (supportsPlatformLogs && platform.getRecentLogs) {
        try {
          const raw = await platform.getRecentLogs(logMinutes);
          if (raw) {
            platformLog = {
              content: raw.content,
              lineCount: raw.lineCount,
              startedAt: raw.startedAt,
              endedAt: raw.endedAt,
              truncated: raw.truncated,
            };
          }
        } catch {
          /* fallthrough to frontend logs */
        }
      }

      const frontendLog = collectFrontendLogs(logMinutes);
      const merged = mergeLogs(platformLog, frontendLog);

      if (!merged) {
        setLogFetchState({ phase: 'error' });
        return;
      }
      setLogFetchState({ phase: 'fetched', data: merged });
      setShowLogPreview(false);
    } catch {
      setLogFetchState({ phase: 'error' });
    }
  }, [logMinutes, platform, supportsPlatformLogs]);

  // =============================================
  // 提交反馈
  // =============================================
  const handleSubmit = useCallback(async () => {
    if (!userId || !accessToken) {
      setSubmitState({ phase: 'error', errorKey: 'feedback.errors.authRequired' });
      return;
    }
    if (!title.trim() || !content.trim()) return;

    setSubmitState({ phase: 'submitting' });

    try {
      // 采集系统信息
      let systemInfo = {
        appVersion: 'unknown',
        platform: platform.getPlatform(),
        osVersion: undefined as string | undefined,
        deviceModel: undefined as string | undefined,
      };
      if (platform.getSystemInfo) {
        try {
          const info = await platform.getSystemInfo();
          systemInfo = {
            appVersion: info.appVersion || 'unknown',
            platform: info.platform,
            osVersion: info.osVersion,
            deviceModel: info.deviceModel,
          };
        } catch {
          /* keep defaults */
        }
      }

      const logData = logFetchState.phase === 'fetched' ? logFetchState.data : null;

      const result = await submitFeedback(
        userId,
        { category, title, content, contact },
        systemInfo,
        logData,
        accessToken,
      );

      if (result.success === false) {
        setSubmitState({
          phase: 'error',
          errorKey: result.errorKey,
          errorOptions: result.errorOptions,
        });
        return;
      }

      setSubmitState({ phase: 'success' });
      // 清空表单
      setTitle('');
      setContent('');
      setContact('');
      setLogFetchState({ phase: 'idle' });
      setShowLogPreview(false);
      // 失效历史缓存，下次展开会重新加载
      historyLoadedRef.current = false;
      if (historyExpanded) {
        void loadHistory();
      }
      // 3 秒后清除成功提示
      setTimeout(() => {
        setSubmitState((prev) => prev.phase === 'success' ? { phase: 'idle' } : prev);
      }, 3000);
    } catch {
      setSubmitState({ phase: 'error', errorKey: 'feedback.errors.submitFailed' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, accessToken, category, title, content, contact, logFetchState, platform, historyExpanded]);

  // =============================================
  // 加载历史
  // =============================================
  const loadHistory = useCallback(async () => {
    if (!userId || !accessToken) return;
    setHistoryLoading(true);
    try {
      const items = await fetchFeedbackHistory(userId, accessToken);
      setHistoryItems(items);
      historyLoadedRef.current = true;
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, accessToken]);

  useEffect(() => {
    if (historyExpanded && !historyLoadedRef.current && userId && accessToken) {
      void loadHistory();
    }
  }, [historyExpanded, userId, accessToken, loadHistory]);

  // =============================================
  // 未登录态
  // =============================================
  if (!userId || !accessToken) {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="border-b border-white/10 pb-4" style={!isGlass ? { borderColor: '#d0e4cb' } : undefined}>
          <h3 className={`text-lg font-bold ${headingText}`}>{t('feedback.title')}</h3>
          <p className={`text-xs ${mutedText}`}>{t('feedback.subtitle')}</p>
        </div>
        <div className={`${cardBase} p-8 flex flex-col items-center justify-center text-center`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconWrap} mb-4`}>
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className={`text-sm ${bodyText} mb-1`}>{t('feedback.loginRequired')}</p>
          <p className={`text-xs ${mutedText} mb-5`}>{t('feedback.loginHint')}</p>
          {onSignInClick && (
            <button
              onClick={onSignInClick}
              className={`${btnPrimary} px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t('nav.logIn')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // =============================================
  // 已登录态：表单 + 历史
  // =============================================
  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && submitState.phase !== 'submitting';
  const isSubmitting = submitState.phase === 'submitting';

  return (
    <div className="space-y-6 max-w-xl">
      {/* 标题区 */}
      <div className="border-b border-white/10 pb-4" style={!isGlass ? { borderColor: '#d0e4cb' } : undefined}>
        <h3 className={`text-lg font-bold ${headingText}`}>{t('feedback.title')}</h3>
        <p className={`text-xs ${mutedText}`}>{t('feedback.subtitle')}</p>
      </div>

      <div className={`${cardBase} p-5 space-y-5`}>
        {/* 分类选择 */}
        <div>
          <label className={`block text-xs font-semibold mb-2 ${headingText}`}>
            {language === 'zh' ? '类型' : 'Type'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FEEDBACK_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const selected = category === cat;
              const selectedClass = isGlass
                ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300'
                : 'bg-[#cceac8] border-[#84c796] text-[#1f422f]';
              const unselectedClass = isGlass
                ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                : 'bg-[#f4f9ef] border-[#d0e4cb] text-[#5d7564] hover:bg-[#eaf3e2]';
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selected ? selectedClass : unselectedClass}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{t(FEEDBACK_CATEGORY_I18N_KEYS[cat] as any)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 标题输入 */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>{t('feedback.fields.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={FEEDBACK_LIMITS.titleMaxLength}
            placeholder={t('feedback.fields.titlePlaceholder')}
            className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBase}`}
          />
        </div>

        {/* 内容输入 */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>{t('feedback.fields.contentLabel')}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={FEEDBACK_LIMITS.contentMaxLength}
            placeholder={t('feedback.fields.contentPlaceholder')}
            rows={5}
            className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors resize-y ${inputBase}`}
          />
          <div className={`text-right text-[10px] mt-1 ${mutedText}`}>
            {content.length} / {FEEDBACK_LIMITS.contentMaxLength}
          </div>
        </div>

        {/* 联系方式 */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>{t('feedback.fields.contactLabel')}</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={FEEDBACK_LIMITS.contactMaxLength}
            placeholder={t('feedback.fields.contactPlaceholder')}
            className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBase}`}
          />
        </div>

        {/* 诊断日志区 */}
        <div className={`pt-4 border-t ${isGlass ? 'border-white/10' : 'border-[#d0e4cb]'}`}>
          <div className="flex items-start gap-2 mb-2">
            <FileText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${mutedText}`} />
            <div>
              <p className={`text-xs font-semibold ${headingText}`}>{t('feedback.logs.sectionTitle')}</p>
              <p className={`text-[11px] ${mutedText} mt-0.5`}>{t('feedback.logs.sectionDesc')}</p>
            </div>
          </div>

          {/* 时间范围选择 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-[11px] ${mutedText}`}>{t('feedback.logs.minutesLabel')}:</span>
            {FEEDBACK_LOG_TIME_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setLogMinutes(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                  logMinutes === m
                    ? (isGlass ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300' : 'bg-[#cceac8] border-[#84c796] text-[#1f422f]')
                    : (isGlass ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10' : 'bg-[#f4f9ef] border-[#d0e4cb] text-[#5d7564] hover:bg-[#eaf3e2]')
                }`}
              >
                {t(`feedback.logs.minutes${m}` as any)}
              </button>
            ))}
          </div>

          {/* 获取日志按钮 / 日志状态 */}
          {logFetchState.phase === 'idle' && (
            <button
              onClick={() => void handleFetchLogs()}
              className={`${btnSecondary} px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer`}
            >
              <FileText className="w-3.5 h-3.5" />
              {t('feedback.logs.fetch')}
            </button>
          )}

          {logFetchState.phase === 'fetching' && (
            <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('feedback.logs.fetching')}
            </div>
          )}

          {logFetchState.phase === 'error' && (
            <div className={`flex items-center gap-2 text-xs text-red-400`}>
              <AlertCircle className="w-3.5 h-3.5" />
              {t('feedback.logs.fetchFailed')}
              <button
                onClick={() => void handleFetchLogs()}
                className="ml-2 underline cursor-pointer hover:text-red-300"
              >
                {t('feedback.logs.refetch')}
              </button>
            </div>
          )}

          {logFetchState.phase === 'fetched' && (
            <div className="space-y-2">
              <div className={`flex flex-wrap items-center gap-2 text-xs ${bodyText}`}>
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span>
                  {t('feedback.logs.fetched', { count: logFetchState.data.lineCount })}
                  {logFetchState.data.truncated && <span className={mutedText}> {t('feedback.logs.truncated')}</span>}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowLogPreview(!showLogPreview)}
                  className={`${btnSecondary} px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer`}
                >
                  {showLogPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showLogPreview ? t('feedback.logs.hidePreview') : t('feedback.logs.preview')}
                </button>
                <button
                  onClick={() => void handleFetchLogs()}
                  className={`${btnSecondary} px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer`}
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('feedback.logs.refetch')}
                </button>
                <button
                  onClick={() => { setLogFetchState({ phase: 'idle' }); setShowLogPreview(false); }}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('feedback.logs.remove')}
                </button>
              </div>
              {showLogPreview && (
                <pre className={`mt-2 p-3 rounded-xl text-[10px] max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono ${
                  isGlass ? 'bg-black/30 text-white/60' : 'bg-[#f4f9ef] text-[#4a6350]'
                }`}>
                  {logFetchState.data.content}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 提交结果消息 */}
        {submitState.phase === 'success' && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />
            {t('feedback.success')}
          </div>
        )}
        {submitState.phase === 'error' && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            {t(submitState.errorKey as any, submitState.errorOptions)}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className={`${canSubmit ? btnPrimary : 'bg-white/10 text-white/30 cursor-not-allowed'} px-5 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-2 transition-all`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('feedback.submitting')}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {t('feedback.submit')}
            </>
          )}
        </button>
      </div>

      {/* 历史反馈区 */}
      <div className={`${cardBase} overflow-hidden`}>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer ${
            isGlass ? 'hover:bg-white/5' : 'hover:bg-[#f4f9ef]'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className={`w-4 h-4 ${mutedText}`} />
            <span className={`text-sm font-semibold ${headingText}`}>{t('feedback.history.title')}</span>
            {historyItems.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isGlass ? 'bg-white/10 text-white/50' : 'bg-[#e8f2e1] text-[#5d7564]'}`}>
                {historyItems.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {historyExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); void loadHistory(); }}
                className={`p-1 ${mutedText} hover:opacity-70 cursor-pointer`}
                title={t('feedback.history.refresh')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {historyExpanded ? <ChevronUp className={`w-4 h-4 ${mutedText}`} /> : <ChevronDown className={`w-4 h-4 ${mutedText}`} />}
          </div>
        </button>

        {historyExpanded && (
          <div className={`px-5 pb-5 pt-1 space-y-3 border-t ${isGlass ? 'border-white/10' : 'border-[#d0e4cb]'}`}>
            {historyLoading && (
              <div className={`flex items-center gap-2 text-xs ${mutedText} py-4`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('feedback.history.loading')}
              </div>
            )}

            {!historyLoading && historyItems.length === 0 && (
              <div className={`text-xs ${mutedText} py-4 text-center`}>
                {t('feedback.history.empty')}
              </div>
            )}

            {!historyLoading && historyItems.map((item) => {
              const statusStyle = isFeedbackStatus(item.status) ? FEEDBACK_STATUS_STYLES[item.status] : FEEDBACK_STATUS_STYLES.new;
              const lang = language === 'zh' ? 'zh-CN' : 'en-US';
              const createdLabel = new Date(item.created_at).toLocaleString(lang);
              const repliedLabel = item.replied_at ? new Date(item.replied_at).toLocaleString(lang) : '';
              const catLabel = isFeedbackCategory(item.category) ? t(FEEDBACK_CATEGORY_I18N_KEYS[item.category] as any) : item.category;
              const statusLabel = isFeedbackStatus(item.status) ? t(FEEDBACK_STATUS_I18N_KEYS[item.status] as any) : item.status;

              return (
                <div key={item.id} className={`p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-[#f4f9ef]'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-semibold ${headingText} flex-1 min-w-0 truncate`}>{item.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className={`text-xs ${bodyText} line-clamp-2 mb-2`}>{item.content}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded ${isGlass ? 'bg-white/10 text-white/50' : 'bg-[#e8f2e1] text-[#5d7564]'}`}>{catLabel}</span>
                    {item.has_log && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-medium">
                        {t('feedback.history.hasLog')}
                      </span>
                    )}
                    <span className={mutedText}>{createdLabel}</span>
                  </div>
                  {item.admin_reply && (
                    <div className={`mt-2 p-2 rounded-lg text-xs ${isGlass ? 'bg-indigo-500/10 border border-indigo-400/20' : 'bg-[#e8f2e1] border border-[#bad8b7]'}`}>
                      <div className={`font-semibold mb-0.5 ${isGlass ? 'text-indigo-300' : 'text-[#336f4e]'}`}>
                        {t('feedback.history.adminReply')}
                        {repliedLabel && <span className={`ml-1 font-normal ${mutedText}`}>{repliedLabel}</span>}
                      </div>
                      <div className={bodyText}>{item.admin_reply}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
