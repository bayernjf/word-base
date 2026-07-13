import { useEffect, useState } from 'react';
import { Check, Copy, TerminalSquare, X } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn } from '../theme';

const INSTALL_COMMAND = 'xattr -cr /Applications/WordBase.app';

interface MacInstallGuideProps {
  open: boolean;
  onClose: () => void;
  theme: LandingTheme;
}

export function MacInstallGuide({ open, onClose, theme }: MacInstallGuideProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = INSTALL_COMMAND;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-md rounded-2xl border p-6 shadow-2xl',
          theme === 'light'
            ? 'bg-white border-slate-200'
            : 'bg-slate-900 border-slate-700/60'
        )}
      >
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 p-1.5 rounded-lg transition-colors',
            theme === 'light'
              ? 'hover:bg-slate-100 text-slate-400'
              : 'hover:bg-slate-800 text-slate-500'
          )}
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <TerminalSquare className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3
              className={cn(
                'text-base font-semibold',
                theme === 'light' ? 'text-slate-800' : 'text-white'
              )}
            >
              macOS 安装引导
            </h3>
            <p
              className={cn(
                'text-xs mt-0.5',
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              )}
            >
              下载完成后的必经操作
            </p>
          </div>
        </div>

        <p
          className={cn(
            'text-sm leading-relaxed mb-4',
            theme === 'light' ? 'text-slate-600' : 'text-slate-300'
          )}
        >
          由于 WordBase 暂未进行 Apple 代码签名，首次打开时系统可能提示「已损坏」或「无法验证开发者」。在终端粘贴运行以下命令即可解除限制：
        </p>

        <div className="relative rounded-xl border overflow-hidden bg-slate-950 border-slate-700/60">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/60">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-slate-500 ml-2">终端 — bash</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <code className="text-sm text-green-400 font-mono break-all">
              <span className="text-slate-500 select-none">$ </span>
              {INSTALL_COMMAND}
            </code>
            <button
              onClick={handleCopy}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        <div
          className={cn(
            'mt-4 flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed',
            theme === 'light' ? 'bg-slate-50 text-slate-500' : 'bg-slate-800/40 text-slate-400'
          )}
        >
          <span className="text-base leading-none shrink-0">💡</span>
          <span>
            复制后打开「终端」app（Spotlight 搜索 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px]">terminal</kbd>），粘贴并回车。之后即可正常启动 WordBase。
          </span>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制到剪贴板' : '一键复制命令'}
          </button>
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border',
              theme === 'light'
                ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            )}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
