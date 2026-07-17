/**
 * 平台能力抽象接口。
 * 每个平台（web / desktop / mobile）各自实现一份，在启动时注入。
 *
 * 设计原则：
 *   1. 只抽象"真正需要平台差异化实现"的能力（TTS / 剪贴板 / 通知 / 键值存储）。
 *   2. window.location / URLSearchParams 在三端 WebView 中均可用，不抽象。
 *   3. speak 接受完整选项对象 + 回调，兼容 Web Speech API 高级用法，
 *      同时为 Tauri / Capacitor 留出实现空间。
 *   4. kv 提供"同步读 + 异步写"的混合模型：
 *      - 启动时 kv.init() 把持久化数据一次性载入内存缓存
 *      - kv.getSync() 在 React 渲染/useState 初始值里可安全同步调用
 *      - kv.set()/remove() 异步落盘，不阻塞渲染
 *      这样业务代码无需为了一个 localStorage 读值重写成 async init 流程。
 */

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
}

export interface PlatformKV {
  /** 启动时一次性把所有 wordbase_ 前缀的 key 加载到内存。 */
  init(): Promise<void>;
  /** 同步读（渲染期安全）。必须在 init() resolve 之后调用才保证数据完整。 */
  getSync(key: string): string | null;
  /** 异步读（未 init 时也可直接调，会 await 内部锁）。 */
  get(key: string): Promise<string | null>;
  /** 异步写：先更新内存缓存，再异步落盘。 */
  set(key: string, value: string): Promise<void>;
  /** 异步删除：先删缓存，再异步落盘。 */
  remove(key: string): Promise<void>;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  version?: string;
  body?: string;
  date?: string;
}

export interface UpdateProgress {
  percentage?: number;
  downloaded?: number;
  total?: number;
}

export type UpdateChannel = 'desktop-binary' | 'mobile-ota';

export interface UpdateService {
  readonly channel: UpdateChannel;
  check(): Promise<UpdateCheckResult>;
  /** Download and prepare the update (desktop: download binary; mobile: fetch OTA bundle). */
  download(onProgress?: (p: UpdateProgress) => void): Promise<void>;
  /** Apply the downloaded update (desktop: install + relaunch; mobile: reloadAsync). */
  apply(): Promise<void>;
  /** True when download() has completed successfully and apply() is ready to call. */
  isReady: boolean;
}

export interface PlatformAPI {
  readonly name: string;

  speak(text: string, options?: SpeakOptions): Promise<void>;
  stopSpeak(): Promise<void>;

  readClipboard(): Promise<string>;
  writeClipboard(text: string): Promise<boolean>;

  showNotification(title: string, body: string): Promise<void>;

  /** 用系统浏览器/系统处理器打开外部 URL。用于公告 action_url 等外链跳转。 */
  openUrl(url: string): Promise<void>;

  /** 平台键值存储。Web=localStorage, Desktop=Tauri Store, Mobile=AsyncStorage。 */
  kv: PlatformKV;

  getPlatform(): 'web' | 'desktop' | 'mobile' | string;

  /** 桌面端二进制更新 / 移动端 OTA 热更新。web 不实现。 */
  updater?: UpdateService;
}

let _platform: PlatformAPI | null = null;

export function setPlatform(platform: PlatformAPI): void {
  _platform = platform;
}

export function getPlatform(): PlatformAPI {
  if (!_platform) {
    throw new Error('Platform not set. Call setPlatform() before using getPlatform().');
  }
  return _platform;
}

export function hasPlatform(): boolean {
  return _platform !== null;
}

/**
 * 创建一个基于内存缓存的 KV 实现辅助工具。
 * 各平台实现可以复用：只要提供 loader/saver/remover 三个底层异步函数即可。
 *
 * 缓存策略：
 *   - init() 时调 loadAll() 把底层全部 key 载入内存
 *   - getSync() 读内存缓存；init 之前（非常早期）回退到同步 localStorage
 *   - get() 先等 init，再读缓存；缓存 miss 时回退到底层单 key 读（readMiss）
 *   - set / remove 先更新缓存，再异步落盘
 */
export function createCachedKV(params: {
  loadAll: () => Promise<Record<string, string>>;
  save: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  /** 缓存 miss 时的单 key 读兜底（可选，未提供则返回 null）。 */
  readMiss?: (key: string) => Promise<string | null>;
}): PlatformKV {
  let cache: Record<string, string> = {};
  let inited = false;
  let initPromise: Promise<void> | null = null;

  const doInit = async () => {
    cache = await params.loadAll();
    inited = true;
  };

  return {
    async init() {
      if (inited) return;
      if (initPromise) return initPromise;
      initPromise = doInit();
      await initPromise;
    },
    getSync(key) {
      if (key in cache) return cache[key];
      if (typeof localStorage !== 'undefined' && !inited) {
        return localStorage.getItem(key);
      }
      return null;
    },
    async get(key) {
      await this.init();
      if (key in cache) return cache[key];
      if (params.readMiss) {
        const v = await params.readMiss(key);
        if (v != null) {
          cache[key] = v;
          try { await params.save(key, v); } catch { /* best effort */ }
          return v;
        }
      }
      return null;
    },
    async set(key, value) {
      await this.init();
      cache[key] = value;
      try {
        await params.save(key, value);
      } catch {
        /* best effort */
      }
    },
    async remove(key) {
      await this.init();
      delete cache[key];
      try {
        await params.remove(key);
      } catch {
        /* best effort */
      }
    },
  };
}
