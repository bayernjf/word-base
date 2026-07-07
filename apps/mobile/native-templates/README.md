# 移动端原生配置模板（Capacitor）

装完 CocoaPods / Android Studio 后，按以下顺序使用本目录下的模板文件。

## 前置

```bash
# iOS 工具链
sudo gem install cocoapods
pod --version  # 验证

# Android 工具链
brew install --cask android-studio
# 装完后打开 Android Studio 一路 Next，装 SDK 时确保勾上：
#   - Android SDK Platform 34
#   - Android SDK Build-Tools 34
#   - Android Emulator
#   - System Images: arm64-v8a API 34（Apple Silicon Mac 必须选 arm64）

# 环境变量（写入 ~/.zshrc）
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.zshrc
source ~/.zshrc
```

## 第一次接入 iOS

```bash
cd apps/mobile
npm run cap:add:ios   # 生成 ios/ 目录
```

合并模板：

```bash
# 1. 权限描述键：把 native-templates/ios/Info.plist.snippet 里的 <key>/<string> 对
#    合并进 ios/App/App/Info.plist 的 <dict> 内
open native-templates/ios/Info.plist.snippet          # 参考
open ios/App/App/Info.plist                           # 目标

# 2. 隐私清单（Apple 2024 起强制要求）
cp native-templates/ios/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
# 然后在 Xcode 里把这个文件"Add Files to App"，勾选 target
```

跑起来：

```bash
npm run cap:sync:ios         # build 前端 + 同步到 ios/
npm run cap:open:ios         # 打开 Xcode
# 或直接跑到模拟器 / 真机
npm run cap:run:ios
```

## 第一次接入 Android

```bash
cd apps/mobile
npm run cap:add:android   # 生成 android/ 目录
```

合并模板：

```bash
# 1. 权限：把 native-templates/android/AndroidManifest.xml.snippet 里的 <uses-permission>
#    合并进 android/app/src/main/AndroidManifest.xml 的 <manifest> 根节点
open native-templates/android/AndroidManifest.xml.snippet
open android/app/src/main/AndroidManifest.xml

# 2. 明文网络配置（开发时连本地服务需要，发布前建议关闭）
mkdir -p android/app/src/main/res/xml
cp native-templates/android/network_security_config.xml android/app/src/main/res/xml/

# 3. 在 AndroidManifest.xml 的 <application> 节点上加两个属性：
#    android:networkSecurityConfig="@xml/network_security_config"
#    android:usesCleartextTraffic="true"
```

跑起来：

```bash
npm run cap:sync:android
npm run cap:open:android     # 打开 Android Studio
# 或直接跑到 AVD 模拟器 / 真机
npm run cap:run:android
```

## 真机调试网络地址速查

| 场景 | `VITE_SYNC_SERVER_URL` |
|---|---|
| iOS 模拟器 | `http://localhost:3001` |
| iPhone 真机（连同一 Wi-Fi） | `http://<Mac 内网 IP>:3001` |
| Android AVD 模拟器 | `http://10.0.2.2:3001`（AVD 专用回环） |
| Android 真机（连同一 Wi-Fi） | `http://<Mac 内网 IP>:3001` |

获取 Mac 内网 IP：`ipconfig getifaddr en0`

## 文件说明

| 文件 | 作用 |
|---|---|
| `ios/Info.plist.snippet` | iOS 权限描述键（麦克风/语音识别/通知/Face ID/剪贴板） |
| `ios/PrivacyInfo.xcprivacy` | Apple 2024 隐私清单（App Store 上架强制） |
| `android/AndroidManifest.xml.snippet` | Android 权限 + 特性声明 |
| `android/network_security_config.xml` | 开发期允许明文流量（10.0.2.2 / 内网） |
