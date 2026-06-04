import React from 'react';
import { 
  Home, BookOpen, Layers, Sparkles, Activity, Settings, Award, ChevronRight, Play, Book
} from 'lucide-react';
import { ThemeClasses } from './ThemeStyles';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  themeStyles: ThemeClasses;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, themeStyles }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Home (仪表盘)', icon: Home },
    { id: 'vocabulary', label: 'My Words (单词表)', icon: BookOpen },
    { id: 'mylists', label: 'My Spacing Lists (词书库)', icon: Layers },
    { id: 'stories', label: 'AI Stories (智能句景)', icon: Sparkles },
    { id: 'practice', label: 'Practice Skills (实践练习)', icon: Activity },
    { id: 'settings-account', label: 'Settings Preferences (配置)', icon: Settings }
  ];

  const parentView = activeView.split('-')[0];
  const isGlass = themeStyles.borderClass === 'border-white/10';

  return (
    <div className={`space-y-6 ${themeStyles.sidebar}`}>
      {/* Learning stats brief */}
      <div className="space-y-3 pb-3 border-b border-neutral-200 dark:border-white/10 font-sans">
        <h3 className={`text-xs font-mono uppercase tracking-widest ${isGlass ? 'text-white/40 font-semibold' : 'text-neutral-400'}`}>
          Learning Progress
        </h3>
        <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-lg ${isGlass ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-500/10 text-indigo-500'}`}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-xs font-bold ${isGlass ? 'text-white' : 'text-slate-800 dark:text-neutral-205'}`}>Level: Intermediate (B2)</div>
            <span className={`text-[10px] font-mono ${isGlass ? 'text-white/40' : 'text-neutral-500'}`}>1,820 Active Words</span>
          </div>
        </div>

        <div className="space-y-11 pt-1">
          <div className={`flex justify-between text-[9px] font-mono ${isGlass ? 'text-white/60' : 'text-neutral-550'}`}>
            <span>Weekly Target</span>
            <span>68%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-slate-200/60 dark:bg-white/10'}`}>
            <div 
              className={`h-full ${isGlass ? 'bg-gradient-to-r from-indigo-400 to-fuchsia-400' : 'bg-indigo-600'}`} 
              style={{ width: '68%' }} 
            />
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <ul className="space-y-1.5">
        {menuItems.map((item) => {
          const isSelected = parentView === item.id.split('-')[0];
          const Icon = item.icon;
          
          let navItemClasses = '';
          if (isSelected) {
            navItemClasses = isGlass 
              ? 'bg-white/10 border border-white/10 text-white shadow-lg shadow-indigo-500/5' 
              : 'bg-indigo-600 text-white shadow-xs';
          } else {
            navItemClasses = isGlass 
              ? 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5' 
              : 'text-neutral-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5';
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
          : 'bg-linear-to-tr from-indigo-500 to-purple-600 text-white border-white/10'
      }`}>
        <div>
          <span className="font-bold block text-sm">Daily Spacing Study is Ready</span>
          <p className={`text-[10px] leading-normal mt-1 ${isGlass ? 'text-white/60' : 'text-white/80'}`}>
            Revisiting word 'negotiate' and spelling matches.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('stories')}
          className={`w-full py-2 font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all text-center cursor-pointer shadow-xs ${
            isGlass 
              ? 'bg-white text-slate-950 hover:bg-white/90 active:scale-95' 
              : 'bg-white text-indigo-700 hover:bg-slate-100 active:scale-95'
          }`}
        >
          Start Daily Lesson
        </button>
      </div>
    </div>
  );
};
