import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'assets');
const DESKTOP_ICONS_DIR = path.join(ROOT, 'apps', 'desktop', 'src-tauri', 'icons');
const IOS_ICONS_DIR = path.join(ROOT, 'apps', 'mobile', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const ANDROID_RES_DIR = path.join(ROOT, 'apps', 'mobile', 'android', 'app', 'src', 'main', 'res');

const appIconSrc = path.join(ASSETS_DIR, 'wordbase-app-icon.svg');

async function generatePng(src, size, output, padding = 0) {
  const dir = path.dirname(output);
  fs.mkdirSync(dir, { recursive: true });

  const innerSize = size - padding * 2;

  await sharp(src)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output);

  console.log(`  ✓ ${path.basename(output)} (${size}x${size})`);
}

async function generateTauriIcons() {
  console.log('\n[icons] Generating Tauri desktop icons...');

  const tasks = [
    { size: 32, name: '32x32.png' },
    { size: 128, name: '128x128.png' },
    { size: 256, name: '128x128@2x.png' },
    { size: 512, name: 'icon.png' },
    { size: 30, name: 'Square30x30Logo.png' },
    { size: 44, name: 'Square44x44Logo.png' },
    { size: 71, name: 'Square71x71Logo.png' },
    { size: 89, name: 'Square89x89Logo.png' },
    { size: 107, name: 'Square107x107Logo.png' },
    { size: 142, name: 'Square142x142Logo.png' },
    { size: 150, name: 'Square150x150Logo.png' },
    { size: 284, name: 'Square284x284Logo.png' },
    { size: 310, name: 'Square310x310Logo.png' },
    { size: 50, name: 'StoreLogo.png' },
  ];

  for (const task of tasks) {
    await generatePng(appIconSrc, task.size, path.join(DESKTOP_ICONS_DIR, task.name));
  }

  console.log('  (icon.icns and icon.ico need to be generated from PNGs separately)');
}

async function generateIosIcons() {
  console.log('\n[icons] Generating iOS AppIcon icons...');

  const iosSizes = [
    { size: 20, idiom: 'iphone', scale: '2x', filename: 'AppIcon-20@2x.png', px: 40 },
    { size: 20, idiom: 'iphone', scale: '3x', filename: 'AppIcon-20@3x.png', px: 60 },
    { size: 29, idiom: 'iphone', scale: '2x', filename: 'AppIcon-29@2x.png', px: 58 },
    { size: 29, idiom: 'iphone', scale: '3x', filename: 'AppIcon-29@3x.png', px: 87 },
    { size: 40, idiom: 'iphone', scale: '2x', filename: 'AppIcon-40@2x.png', px: 80 },
    { size: 40, idiom: 'iphone', scale: '3x', filename: 'AppIcon-40@3x.png', px: 120 },
    { size: 60, idiom: 'iphone', scale: '2x', filename: 'AppIcon-60@2x.png', px: 120 },
    { size: 60, idiom: 'iphone', scale: '3x', filename: 'AppIcon-60@3x.png', px: 180 },
    { size: 20, idiom: 'ipad', scale: '1x', filename: 'AppIcon-20.png', px: 20 },
    { size: 20, idiom: 'ipad', scale: '2x', filename: 'AppIcon-20@2x.png', px: 40 },
    { size: 29, idiom: 'ipad', scale: '1x', filename: 'AppIcon-29.png', px: 29 },
    { size: 29, idiom: 'ipad', scale: '2x', filename: 'AppIcon-29@2x.png', px: 58 },
    { size: 40, idiom: 'ipad', scale: '1x', filename: 'AppIcon-40.png', px: 40 },
    { size: 40, idiom: 'ipad', scale: '2x', filename: 'AppIcon-40@2x.png', px: 80 },
    { size: 76, idiom: 'ipad', scale: '1x', filename: 'AppIcon-76.png', px: 76 },
    { size: 76, idiom: 'ipad', scale: '2x', filename: 'AppIcon-76@2x.png', px: 152 },
    { size: 83.5, idiom: 'ipad', scale: '2x', filename: 'AppIcon-83.5@2x.png', px: 167 },
    { size: 1024, idiom: 'ios-marketing', scale: '1x', filename: 'AppIcon-512@2x.png', px: 1024 },
  ];

  const images = [];

  for (const sz of iosSizes) {
    await generatePng(appIconSrc, sz.px, path.join(IOS_ICONS_DIR, sz.filename));
    images.push({
      filename: sz.filename,
      idiom: sz.idiom,
      size: sz.size === 83.5 ? '83.5x83.5' : `${sz.size}x${sz.size}`,
      scale: sz.scale,
    });
  }

  const contentsJson = {
    images,
    info: { author: 'xcode', version: 1 },
  };

  fs.writeFileSync(
    path.join(IOS_ICONS_DIR, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2) + '\n',
  );

  console.log('  ✓ Contents.json updated');
}

async function generateAndroidIcons() {
  console.log('\n[icons] Generating Android launcher icons...');

  const densities = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const d of densities) {
    const dir = path.join(ANDROID_RES_DIR, d.name);
    fs.mkdirSync(dir, { recursive: true });

    await generatePng(appIconSrc, d.size, path.join(dir, 'ic_launcher.png'));
    await generatePng(appIconSrc, d.size, path.join(dir, 'ic_launcher_round.png'));
    await generatePng(appIconSrc, d.size, path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('  ✓ All Android mipmap densities updated');
}

async function main() {
  console.log('[generate-icons] Starting icon generation...');

  if (!fs.existsSync(appIconSrc)) {
    console.error(`  ✗ Source SVG not found: ${appIconSrc}`);
    process.exit(1);
  }

  await generateTauriIcons();
  await generateIosIcons();
  await generateAndroidIcons();

  console.log('\n[generate-icons] All icons generated successfully!');
}

main().catch((err) => {
  console.error('[generate-icons] Error:', err);
  process.exit(1);
});
