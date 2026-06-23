import React, { useState, useEffect } from 'react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface AccountSettingsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  user: { id: string; email: string; nickname?: string; avatar?: number; createdAt: number } | null;
  onUpdateProfile: (data: { nickname?: string; avatar?: number }) => Promise<boolean>;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteAccount: () => Promise<{ ok: boolean; error?: string }>;
}

// Avatar Select Component for Account Settings
function AccountAvatarSelect({
  themeStyles,
  currentAvatar,
  onUpdate
}: {
  themeStyles: ThemeClasses;
  currentAvatar: number;
  onUpdate: (data: { nickname?: string; avatar?: number }) => Promise<boolean>;
}) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Predefined avatars (same as server-side)
    const defaultAvatars = [
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FFB6C1"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><path d="M 35 60 Q 50 75 65 60" stroke="#333" stroke-width="3" fill="none"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#87CEEB"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><rect x="35" y="55" width="30" height="15" rx="7" fill="#FFD700"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#90EE90"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><path d="M 35 65 Q 50 55 65 65" stroke="#333" stroke-width="3" fill="none"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#DDA0DD"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><path d="M 35 60 Q 50 50 65 60" stroke="#333" stroke-width="3" fill="none"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#F0E68C"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><ellipse cx="50" cy="60" rx="15" ry="10" fill="#FF6B6B"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#E6E6FA"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><polygon points="50,55 55,70 45,70" fill="#FFA500"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FFEFD5"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><circle cx="50" cy="62" r="8" fill="#FF69B4"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#B0E0E6"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><rect x="40" y="55" width="20" height="15" rx="3" fill="#8B4513"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FAFAD2"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><ellipse cx="50" cy="65" rx="12" ry="8" fill="#20B2AA"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FFE4E1"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><path d="M 40 60 L 45 55 L 50 60 L 55 55 L 60 60" stroke="#333" stroke-width="3" fill="none"/></svg>`
    ];
    setAvatars(defaultAvatars);
  }, []);

  const handleSelectAvatar = async (index: number) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const success = await onUpdate({ avatar: index });
      if (success) {
        setMessage({ text: '头像更新成功！', type: 'success' });
      } else {
        setMessage({ text: '更新失败', type: 'error' });
      }
    } catch {
      setMessage({ text: '更新失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-5 gap-2">
        {avatars.map((avatar, index) => (
          <button
            key={index}
            onClick={() => handleSelectAvatar(index)}
            disabled={isLoading}
            className={`p-1 rounded-lg border-2 transition-all ${
              currentAvatar === index
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-neutral-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div
              dangerouslySetInnerHTML={{ __html: avatar }}
              className="w-12 h-12 mx-auto"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export const AccountSettingsView: React.FC<AccountSettingsProps> = ({ 
  themeStyles, 
  language,
  user, 
  onUpdateProfile, 
  onChangePassword,
  onDeleteAccount
}) => {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || user?.email?.split('@')[0] || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showFirstModal, setShowFirstModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const t = createTranslator(language);

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) return;
    setIsUpdating(true);
    setProfileMessage(null);
    try {
      const success = await onUpdateProfile({ nickname: nickname.trim() });
      if (success) {
        setProfileMessage({ text: t('account.updateNicknameSuccess'), type: 'success' });
        setIsEditingNickname(false);
      } else {
        setProfileMessage({ text: t('account.updateFailed'), type: 'error' });
      }
    } catch {
      setProfileMessage({ text: t('account.updateFailed'), type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: t('account.passwordMismatch'), type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: t('account.passwordShort'), type: 'error' });
      return;
    }
    setIsChangingPassword(true);
    setPasswordMessage(null);
    try {
      const result = await onChangePassword(oldPassword, newPassword);
      if (result.ok) {
        setPasswordMessage({ text: t('account.passwordUpdated'), type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ text: result.error || t('account.passwordChangeFailed'), type: 'error' });
      }
    } catch {
      setPasswordMessage({ text: t('account.passwordChangeFailed'), type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    setDeleteAccountMessage(null);
    setIsDeletingAccount(true);
    try {
      const result = await onDeleteAccount();
      if (!result.ok) {
        setDeleteAccountMessage({ text: result.error || t('account.deleteFailed'), type: 'error' });
        return;
      }

      setShowSecondModal(false);
      setShowFirstModal(false);
    } catch {
      setDeleteAccountMessage({ text: t('account.deleteFailed'), type: 'error' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('account.title')}</h3>
        <p className="text-xs text-neutral-400">{t('account.subtitle')}</p>
      </div>

      <div className="space-y-8">
        {/* Avatars */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3">{t('account.avatar')}</h4>
          <AccountAvatarSelect 
            themeStyles={themeStyles}
            currentAvatar={user?.avatar || 0}
            onUpdate={onUpdateProfile}
          />
        </div>

        {/* User Info */}
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${themeStyles.secondaryBg}`}>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{t('account.email')}</label>
            <div className={themeStyles.textPrimary}>{user?.email || t('account.notLoggedIn')}</div>
          </div>
          <div className={`p-4 rounded-lg ${themeStyles.secondaryBg}`}>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{t('account.nickname')}</label>
            {profileMessage && (
              <div className={`mb-3 p-2 rounded-lg text-xs ${profileMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {profileMessage.text}
              </div>
            )}
            {isEditingNickname ? (
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-lg ${themeStyles.textPrimary}`}
                  autoFocus
                />
                <button 
                  onClick={handleUpdateNickname}
                  disabled={isUpdating}
                  className={`${themeStyles.btnPrimary} px-4 py-2 text-xs`}
                >
                  {isUpdating ? t('account.saveLoading') : t('account.save')}
                </button>
                <button 
                  onClick={() => { 
                    setIsEditingNickname(false); 
                    setNickname(user?.nickname || user?.email?.split('@')[0] || ''); 
                  }}
                  className={`${themeStyles.btnSecondary} px-4 py-2 text-xs`}
                >
                  {t('account.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className={themeStyles.textPrimary}>{nickname}</span>
                <button 
                  onClick={() => setIsEditingNickname(true)}
                  className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline"
                >
                  {t('account.edit')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div>
          <h4 className={`text-sm font-semibold ${themeStyles.textPrimary} mb-4`}>{t('account.changePassword')}</h4>
          <form onSubmit={handleChangePassword} className={`space-y-4 p-6 rounded-lg ${themeStyles.card}`}>
            {passwordMessage && (
              <div className={`p-3 rounded-lg text-xs ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {passwordMessage.text}
              </div>
            )}
            <div>
              <label className={`block text-xs font-semibold mb-2 ${themeStyles.textPrimary}`}>{t('account.currentPassword')}</label>
              <input 
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${themeStyles.textPrimary}`}>{t('account.newPassword')}</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${themeStyles.textPrimary}`}>{t('account.confirmPassword')}</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                required
                minLength={6}
              />
            </div>
            <button 
              type="submit"
              disabled={isChangingPassword}
              className={`w-full ${themeStyles.btnPrimary} py-2.5 mt-2 text-xs font-semibold`}
            >
              {isChangingPassword ? t('account.changingPassword') : t('account.submitPassword')}
            </button>
          </form>
        </div>

        {/* Subscriptions badge - Hidden */}
        {false && (
        <div className="p-4 bg-linear-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl border border-amber-500/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-extrabold text-amber-800">Premium Pro Subscription Active</span>
            <span className="bg-amber-100 text-amber-800 text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold">ACTIVE</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-normal">
            Your custom spaced learning books, cloud storage backups and real AI pronunciations are active until Jan 2027.
          </p>
        </div>
        )}

        {/* Delete Account */}
        <div className="pt-4 border-t border-neutral-200 dark:border-white/10">
          {deleteAccountMessage && (
            <div className={`mb-3 p-3 rounded-lg text-xs ${deleteAccountMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {deleteAccountMessage.text}
            </div>
          )}
          <button 
            type="button"
            onClick={() => {
              setDeleteAccountMessage(null);
              setShowFirstModal(true);
            }}
            className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
          >
            {t('account.deleteAccount')}
          </button>
        </div>
      </div>

      {/* First Modal */}
      {showFirstModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{t('account.deleteTitle1')}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {t('account.deleteDesc1')}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowFirstModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {t('account.cancel')}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowFirstModal(false);
                  setDeleteAccountMessage(null);
                  setShowSecondModal(true);
                }}
                className={`px-4 py-2 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50`}
              >
                {t('account.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Modal */}
      {showSecondModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{t('account.deleteTitle2')}</h3>
            {deleteAccountMessage && (
              <div className={`mb-4 p-3 rounded-lg text-xs ${deleteAccountMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {deleteAccountMessage.text}
              </div>
            )}
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowSecondModal(false)}
                disabled={isDeletingAccount}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {t('account.cancel')}
              </button>
              <button 
                type="button"
                onClick={() => {
                  void handleDeleteAccountConfirm();
                }}
                disabled={isDeletingAccount}
                className={`px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700`}
              >
                {isDeletingAccount ? t('account.deleting') : t('account.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
