const CONSENT_KEY = 'wordbase_analytics_consent';

export type ConsentState = 'granted' | 'denied';

let _initialized = false;
let _storageListenerInstalled = false;

export function getConsent(): ConsentState | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'granted' || v === 'denied') return v;
  } catch {}
  return null;
}

function _installStorageListener(): void {
  if (_storageListenerInstalled) return;
  if (typeof window === 'undefined') return;
  _storageListenerInstalled = true;
  window.addEventListener('storage', (e) => {
    if (e.key === CONSENT_KEY) {
      const newVal = e.newValue as ConsentState | null;
      if (newVal === 'granted') {
        if (!_initialized) {
          _loadAnalytics();
        } else {
          const w = window as any;
          if (typeof w?.gtag === 'function') {
            w.gtag('consent', 'update', { analytics_storage: 'granted' });
          }
          if (typeof w?.clarity === 'function') {
            w.clarity('consent', true);
          }
        }
        trackPageView();
      } else if (newVal === 'denied') {
        _disableAnalytics();
      }
    }
  });
}

export function setConsent(state: ConsentState): void {
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch {}
  if (state === 'granted') {
    const w = typeof window === 'undefined' ? undefined : window as any;
    if (_initialized) {
      if (typeof w?.gtag === 'function') {
        w.gtag('consent', 'update', { analytics_storage: 'granted' });
      }
      if (typeof w?.clarity === 'function') {
        w.clarity('consent', true);
      }
    } else {
      _loadAnalytics();
    }
    trackPageView();
  } else {
    _disableAnalytics();
  }
}

export function openAnalyticsConsent(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('wordbase:open-analytics-consent'));
}

function _deleteAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const prefixes = ['_ga', '_clck', '_clsk', 'CLID', 'ANONCHK', 'MR', 'MUID', 'SM'];
  for (const item of document.cookie.split(';')) {
    const name = item.split('=')[0]?.trim();
    if (!name || !prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}_`))) continue;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}; SameSite=Lax`;
  }
}

function _disableAnalytics(): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
  if (typeof w.clarity === 'function') {
    w.clarity('consent', false);
  }
  _deleteAnalyticsCookies();
}

export function hasConsent(): boolean {
  return getConsent() === 'granted';
}

function _getEnv(name: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[name] as string | undefined;
    }
  } catch {}
  return undefined;
}

function _loadGA4(id: string): void {
  if (typeof window === 'undefined') return;
  const w = window as any;

  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    w.dataLayer.push(arguments);
  };

  w.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });

  if (getConsent() === 'granted') {
    w.gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
  }

  const el = document.createElement('script');
  el.async = true;
  el.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(el);

  w.gtag('js', new Date());
  w.gtag('config', id, { send_page_view: false });
}

function _loadClarity(id: string): void {
  if (typeof window === 'undefined') return;
  if (getConsent() !== 'granted') return;

  const w = window as any;
  w.clarity =
    w.clarity ||
    function () {
      (w.clarity.q = w.clarity.q || []).push(arguments);
    };
  const el = document.createElement('script');
  el.async = true;
  el.src = `https://www.clarity.ms/tag/${id}`;
  document.head.appendChild(el);
}

function _loadAnalytics(): void {
  if (_initialized) return;
  if (typeof window === 'undefined') return;

  try {
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      _initialized = true;
      return;
    }
  } catch {}

  const gaId = _getEnv('VITE_GA_MEASUREMENT_ID') || _getEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID');
  const clarityId = _getEnv('VITE_CLARITY_PROJECT_ID');

  if (!gaId && !clarityId) return;

  _initialized = true;

  if (gaId) _loadGA4(gaId);
  if (clarityId) _loadClarity(clarityId);
}

export function initAnalytics(): void {
  _installStorageListener();
  const init = () => {
    const consent = getConsent();
    if (consent === 'granted') {
      _loadAnalytics();
    } else if (consent === null) {
      _initialized = false;
    }
  };
  if (typeof document === 'undefined' || document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
}

export function trackPageView(pageTitle?: string): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (typeof w.gtag !== 'function') return;
  w.gtag('event', 'page_view', {
    page_title: pageTitle || document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
}

export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (typeof w.gtag !== 'function') return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  w.gtag('event', action, clean);
}