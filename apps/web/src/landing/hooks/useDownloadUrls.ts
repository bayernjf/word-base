import { useEffect, useState } from 'react';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export function useDownloadUrls() {
  const [urls, setUrls] = useState<{
    mac: string;
    win: string;
    android: string;
    ios: string;
    chrome: string;
  }>({ mac: '', win: '', android: '', ios: '', chrome: '' });

  useEffect(() => {
    const fetchWordBaseReleases = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/bayernjf/word-base/releases', {
          headers: { Accept: 'application/vnd.github+json' },
        });
        const releases = await res.json();
        const latest = Array.isArray(releases) && releases.length > 0 ? releases[0] : null;
        const assets: ReleaseAsset[] = latest?.assets || [];
        setUrls((prev) => ({
          ...prev,
          mac: assets.find((a) => a.name.endsWith('.dmg'))?.browser_download_url || '',
          win: assets.find((a) => a.name.endsWith('.exe'))?.browser_download_url || '',
          android: assets.find((a) => a.name.endsWith('.apk'))?.browser_download_url || '',
          ios: assets.find((a) => a.name.includes('iOS') && a.name.endsWith('.zip'))?.browser_download_url || '',
        }));
      } catch {
        setUrls((prev) => ({ ...prev, mac: '', win: '', android: '', ios: '' }));
      }
    };

    const fetchWordPickerReleases = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/bayernjf/word-picker/releases', {
          headers: { Accept: 'application/vnd.github+json' },
        });
        const releases = await res.json();
        const latest = Array.isArray(releases) && releases.length > 0 ? releases[0] : null;
        const assets: ReleaseAsset[] = latest?.assets || [];
        const chrome = assets.find((a) => a.name.includes('chrome') && a.name.endsWith('.zip'));
        setUrls((prev) => ({
          ...prev,
          chrome: chrome?.browser_download_url || '',
        }));
      } catch {
        setUrls((prev) => ({ ...prev, chrome: '' }));
      }
    };

    fetchWordBaseReleases();
    fetchWordPickerReleases();
  }, []);

  const download = (platform: string, url: string, fallback: string) => {
    trackEvent('download_click', {
      platform,
      destination: url ? 'release_asset' : 'github_releases',
    });
    if (url) {
      window.location.href = url;
    } else {
      window.open(fallback, '_blank');
    }
  };

  return {
    urls,
    downloadMac: () => download('mac', urls.mac, 'https://github.com/bayernjf/word-base/releases'),
    downloadWin: () => download('windows', urls.win, 'https://github.com/bayernjf/word-base/releases'),
    downloadAndroid: () => download('android', urls.android, 'https://github.com/bayernjf/word-base/releases'),
    downloadIos: () => download('ios', urls.ios, 'https://github.com/bayernjf/word-base/releases'),
    downloadChrome: () => download('browser_extension', urls.chrome, 'https://github.com/bayernjf/word-picker/releases'),
  };
}
