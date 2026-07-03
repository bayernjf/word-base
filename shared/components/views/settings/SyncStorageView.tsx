import React, { useState, useEffect } from 'react';
import { Upload, Database } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getPlatform } from '../../../platform';
import { apiUrl } from '../../../lib/apiBase';

interface SyncStorageProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
}

export const SyncStorageView: React.FC<SyncStorageProps> = ({ themeStyles, language }) => {
  const t = createTranslator(language);
  const [cloudSync, setCloudSync] = useState(true);
  const [extensionStatus, setExtensionStatus] = useState(t('sync.statusEnabled'));
  const [copied, setCopied] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState<number | null>(null);
  const [pairingError, setPairingError] = useState('');

  const getToken = () => {
    try {
      return getPlatform().kv.getSync('wordbase_token') || '';
    } catch {
      return '';
    }
  };

  const loadPairingCode = async (forceNew: boolean) => {
    let token = getToken();
    if (!token) {
      try {
        const res = await fetch(apiUrl('/api/v1/session/bootstrap'), { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          const next = typeof data?.token === 'string' ? data.token : '';
          if (next) {
            await getPlatform().kv.set('wordbase_token', next);
            token = next;
          }
        }
      } catch {
        token = '';
      }
    }
    if (!token) {
      setPairingError(t('sync.noToken'));
      return;
    }
    try {
      setPairingError('');
      const res = await fetch(apiUrl(forceNew ? '/api/v1/pairing/new' : '/api/v1/pairing/code'), {
        method: forceNew ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        setPairingError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      const code = typeof data?.code === 'string' ? data.code : '';
      const expiresAt = Number.isFinite(data?.expiresAt) ? Number(data.expiresAt) : null;
      setPairingCode(code);
      setPairingExpiresAt(expiresAt);
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopy = () => {
    if (!pairingCode) {
      return;
    }
    getPlatform().writeClipboard(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    loadPairingCode(false);
  }, []);

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('sync.title')}</h3>
        <p className="text-xs text-neutral-400">{t('sync.subtitle')}</p>
      </div>

      <div className="space-y-5 text-xs">
        {/* Sync status element */}
        <div className="flex justify-between items-center py-3 bg-zinc-500/5 px-4 rounded-xl border border-neutral-300/30">
          <div>
            <span className="font-bold block">{t('sync.syncTitle')}</span>
            <span className="text-[10px] text-neutral-400">{t('sync.syncDesc')}</span>
          </div>
          <input 
            type="checkbox" 
            checked={cloudSync}
            onChange={() => setCloudSync(!cloudSync)}
            className="rounded cursor-pointer accent-indigo-650"
          />
        </div>

        {/* Extensions details */}
        <div className={`${themeStyles.card} space-y-3 p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-sm">{t('sync.pairingTitle')}</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">{t('sync.pairingDesc')}</p>
            </div>
            <span className="bg-emerald-550/15 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase">
              {extensionStatus}
            </span>
          </div>

          <div className="pt-2">
            <span className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">{t('sync.pairingCode')}</span>
            <div className="flex space-x-1.5 items-center">
              <input 
                type="text" 
                readOnly 
                value={pairingCode || (pairingError ? `${t('sync.errorPrefix')}: ${pairingError}` : '')}
                className="bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex-1"
              />
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold font-sans hover:bg-indigo-700 cursor-pointer"
              >
                {copied ? t('sync.copied') : t('sync.copyCode')}
              </button>
              <button
                onClick={() => loadPairingCode(true)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-semibold font-sans hover:bg-slate-300 dark:hover:bg-white/15 cursor-pointer"
              >
                {t('sync.refresh')}
              </button>
            </div>
            {pairingExpiresAt ? (
              <div className="text-[10px] text-neutral-400 mt-2 font-mono">
                {t('sync.expires')}: {new Date(pairingExpiresAt).toLocaleString()}
              </div>
            ) : null}
          </div>
        </div>

        {/* Cache bounds storage bar */}
        <div className="space-y-1 bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-neutral-200 dark:border-white/10">
          <div className="flex justify-between uppercase font-mono text-[9px] text-neutral-400 font-bold">
            <span>{t('sync.cache')}</span>
            <span>{t('sync.cacheAmount')}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: '28%' }} />
          </div>
        </div>

        {/* Dynamic backup data operations */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Upload className="w-4 h-4 text-neutral-400" />
            <span>{t('sync.export')}</span>
          </button>
          
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Database className="w-4 h-4 text-neutral-400" />
            <span>{t('sync.import')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
