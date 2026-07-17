import React from 'react';
import {
  Home, BookOpen, Layers, Sparkles, Activity, Settings, ChevronRight, Megaphone
} from 'lucide-react';
import { ThemeClasses } from './ThemeStyles';
import { AVATARS } from '../avatars';
import { AppLanguage } from '../types';
import { createTranslator } from '../i18n';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  themeStyles: ThemeClasses;
  language: AppLanguage;
  user?: { id: string; email: string; nickname?: string; avatar?: number; createdAt: number } | null;
  announcementUnreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, themeStyles, language, user, announcementUnreadCount = 0 }) => {
  const t = createTranslator(language);
  const menuItems: { id: string; label: string; icon: typeof Home; hidden?: boolean; badge?: number }[] = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: Home },
    { id: 'vocabulary', label: t('sidebar.vocabulary'), icon: BookOpen },
    { id: 'mylists', label: t('sidebar.mylists'), icon: Layers },
    { id: 'stories', label: t('sidebar.stories'), icon: Sparkles },
    { id: 'practice', label: t('sidebar.practice'), icon: Activity },
    { id: 'announcements', label: t('sidebar.announcements'), icon: Megaphone, badge: announcementUnreadCount },
    { id: 'settings-account', label: t('sidebar.settings'), icon: Settings }
  ];

  const parentView = activeView.split('-')[0];
  const isGlass = themeStyles.name === 'glass';
  const avatarIndex = user?.avatar ?? 0;
  const avatarSvg = AVATARS[Math.max(0, Math.min(AVATARS.length - 1, avatarIndex))];
  const displayName = user?.nickname || user?.email?.split('@')[0] || t('sidebar.userFallback');
  const dailyCopy = {
    title: t('sidebar.dailyTitle'),
    description: t('sidebar.dailyDescription'),
    cta: t('sidebar.dailyCta'),
  };

  return (
    <div className={`space-y-6 ${themeStyles.sidebar}`}>
      {/* User profile */}
      <div className={`space-y-3 pb-3 border-b font-sans ${isGlass ? 'border-white/10' : 'border-[#bad8b7]'}`}>
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20" dangerouslySetInnerHTML={{ __html: avatarSvg }} />
          <h3 className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-[#244235]'}`}>{displayName}</h3>
        </div>
      </div>

      {/* Navigation list */}
      <ul className="space-y-1.5">
        {menuItems.filter(item => !item.hidden).map((item) => {
          const isSelected = parentView === item.id.split('-')[0];
          const Icon = item.icon;
          
          let navItemClasses = '';
          if (isSelected) {
            navItemClasses = isGlass 
              ? 'bg-white/10 border border-white/10 text-white shadow-lg shadow-indigo-500/5' 
              : 'bg-[#cceac8] border border-[#84c796] text-[#173f2b] shadow-md shadow-[#88bd90]/25';
          } else {
            navItemClasses = isGlass 
              ? 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5' 
              : 'text-[#5d7564] hover:text-[#1f422f] hover:bg-[#f8fff2] border border-transparent hover:border-[#bad8b7]';
          }

          return (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-sans text-xs font-semibold cursor-pointer ${navItemClasses}`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {!!item.badge && item.badge > 0 && (
                    <span className={`ml-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                      isGlass
                        ? 'bg-rose-500/90 text-white'
                        : 'bg-[#e88080] text-white'
                    }`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : 'opacity-30'}`} />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Start Daily Lesson Action Card CTA */}
      <div className={`p-5 rounded-2xl border text-xs text-center space-y-3 shadow-inner ${
        isGlass 
          ? 'bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border-white/10 text-white backdrop-blur-xl' 
          : 'bg-linear-to-br from-[#cfedc9] via-[#fff1c7] to-[#ffdcd1] text-[#1f4a33] border-[#a9d4a4] shadow-md shadow-[#88bd90]/20'
      }`}>
        <div>
          <span className="font-bold block text-sm">{dailyCopy.title}</span>
          <p className={`text-[10px] leading-normal mt-1 ${isGlass ? 'text-white/60' : 'text-[#6b7f6e]'}`}>
            {dailyCopy.description}
          </p>
        </div>
        <button 
          onClick={() => onNavigate('vocabulary')}
          className={`w-full py-2 font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all text-center cursor-pointer shadow-xs ${
            isGlass 
              ? 'bg-white text-slate-950 hover:bg-white/90 active:scale-95' 
              : 'bg-[#fffdf7] text-[#2f7051] border border-white/80 hover:bg-white active:scale-95 shadow-xs shadow-[#8fb998]/15'
          }`}
        >
          {dailyCopy.cta}
        </button>
      </div>
    </div>
  );
};
