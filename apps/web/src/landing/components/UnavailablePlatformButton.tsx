import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LandingTheme } from '../Landing';
import { cn } from '../theme';

interface Props {
  children: ReactNode;
  theme: LandingTheme;
  className: string;
}

export function UnavailablePlatformButton({ children, theme, className }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPosition({ x: event.clientX, y: event.clientY });
    timerRef.current = setTimeout(() => setVisible(true), 300);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  };

  return (
    <>
      <button
        type="button"
        aria-disabled="true"
        onClick={(event) => event.preventDefault()}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </button>
      {visible && createPortal(
        <div
          role="tooltip"
          className={cn(
            'fixed z-[100] -translate-x-full -translate-y-full whitespace-nowrap rounded-xl border px-6 py-4 text-base font-medium shadow-xl pointer-events-none',
            theme === 'dark'
              ? 'border-slate-700 bg-slate-900 text-slate-100 shadow-black/30'
              : 'border-slate-200 bg-white text-slate-700 shadow-slate-900/15',
          )}
          style={{ left: position.x, top: position.y }}
        >
          该平台紧急更新上架中
        </div>,
        document.body,
      )}
    </>
  );
}
