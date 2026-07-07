# 桌面端原生配置模板（Tauri）

装完 Rust 后，按以下顺序使用本目录下的模板文件。

## 前置

```bash
# Rust 工具链（一次性）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# 验证：
rustc --version && cargo --version
```

## 第一次接入 Tauri

```bash
cd apps/desktop
npm run tauri:init
```

`tauri init` 会交互式提问，按下面回答：

| 提问 | 回答 |
|---|---|
| App name | `wordbase-desktop` |
| Window title | `WordBase` |
| Web assets location | `../dist` |
| URL of dev server | `http://localhost:3002` |
| Frontend dev command | `npm run dev` |
| Frontend build command | `npm run build` |

跑完会生成 `src-tauri/` 目录。

## 合并模板

```bash
# 1. 替换 tauri.conf.json
cp native-templates/tauri.conf.json src-tauri/tauri.conf.json

# 2. 覆盖默认 capability
cp native-templates/capabilities/default.json src-tauri/capabilities/default.json

# 3. 添加 Rust 依赖
cd src-tauri
cargo add tauri-plugin-clipboard-manager tauri-plugin-notification tauri-plugin-shell
cd ..

# 4. 用模板 lib.rs 替换原文件
cp native-templates/lib.rs src-tauri/src/lib.rs
```

## 跑起来

```bash
npm run tauri:dev       # 开发（会同时拉起 vite dev server + Rust 编译）
npm run tauri:build     # 打包 .dmg / .app（macOS 直出）
```

## 交叉编译 Windows 版

Mac 本机做不了。在你 Win PC 上：

```bash
git clone <repo>
cd word-base && npm install
cd apps/desktop
npm run tauri:build      # 出 .msi
```

或者用 GitHub Actions（`.github/workflows/desktop-release.yml`，以后我再帮你写）。

## 文件说明

| 文件 | 作用 |
|---|---|
| `tauri.conf.json` | Tauri 主配置：产品名、窗口尺寸、bundle 元信息 |
| `capabilities/default.json` | 权限白名单：剪贴板/通知/shell 命令（macOS say / Windows powershell） |
| `Cargo.toml.patch` | Rust 依赖片段（三个 plugin） |
| `lib.rs` | Rust 入口，注册三个 plugin |
