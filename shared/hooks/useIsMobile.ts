import { useState, useEffect } from 'react';
import { API_PLATFORM } from '../lib/apiBase';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (API_PLATFORM === 'ios' || API_PLATFORM === 'android') return true;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (API_PLATFORM === 'ios' || API_PLATFORM === 'android') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
