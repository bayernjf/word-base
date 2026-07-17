#!/usr/bin/env node
/**
 * Inject version number into all package configs before CI build.
 * Usage: node scripts/set-version.cjs <version>
 *   version can be like "1.2.3", "v1.2.3", or "snapshot"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let raw = process.argv[2];
if (!raw) {
  console.error('Usage: node set-version.cjs <version>');
  process.exit(1);
}
raw = raw.replace(/^v/, '');

const isSnapshot = raw === 'snapshot' || !/^\d+\.\d+\.\d+/.test(raw);
const semver = isSnapshot ? '0.0.0-dev' : raw;

console.log(`Raw input:     ${raw}`);
console.log(`Is snapshot:   ${isSnapshot}`);
console.log(`Semver value:  ${semver}`);

function updateJson(filePath, mutator) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    console.log(`  skip   ${filePath} (not found)`);
    return;
  }
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  mutator(json);
  fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n');
  console.log(`  updated ${filePath}`);
}

function replaceInFile(filePath, regex, replacement) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    console.log(`  skip   ${filePath} (not found)`);
    return;
  }
  let content = fs.readFileSync(abs, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(abs, content);
  console.log(`  updated ${filePath}`);
}

// Version code for mobile: MAJOR*10000 + MINOR*100 + PATCH
// Snapshot must use a positive integer (Android Gradle rejects 0); 1 is fine
// because snapshot APKs are never published to Play Store.
let versionCode;
if (isSnapshot) {
  versionCode = 1;
} else {
  const basePart = semver.split('-')[0];
  const [maj, min, pat] = basePart.split('.').map(n => parseInt(n, 10) || 0);
  versionCode = maj * 10000 + min * 100 + pat;
}

// Root package.json
updateJson('package.json', (j) => { j.version = semver; });

// Desktop: Tauri config (src-tauri/tauri.conf.json is the one tauri reads at build time)
const updaterPubkey = process.env.TAURI_SIGNING_PUBKEY || '';
updateJson('apps/desktop/src-tauri/tauri.conf.json', (j) => {
  j.version = semver;
  if (updaterPubkey) {
    j.plugins = j.plugins || {};
    j.plugins.updater = j.plugins.updater || {};
    j.plugins.updater.pubkey = updaterPubkey;
  }
});

// Desktop: package.json
updateJson('apps/desktop/package.json', (j) => { j.version = semver; });

// Desktop: Cargo.toml (simple regex, not full TOML parser)
replaceInFile(
  'apps/desktop/src-tauri/Cargo.toml',
  /^version\s*=\s*"[^"]*"/m,
  `version = "${semver}"`
);

// Mobile: app.json (Expo "version") + buildNumber/versionCode + OTA updates URL
const expoUpdatesUrl = process.env.EXPO_UPDATES_URL || '';
updateJson('apps/mobile/app.json', (j) => {
  j.expo.version = semver;
  j.expo.ios = j.expo.ios || {};
  j.expo.ios.buildNumber = String(versionCode);
  j.expo.android = j.expo.android || {};
  j.expo.android.versionCode = versionCode;
  if (expoUpdatesUrl) {
    j.expo.updates = j.expo.updates || {};
    j.expo.updates.url = expoUpdatesUrl;
    j.expo.updates.enabled = true;
  }
});

// Mobile package.json
updateJson('apps/mobile/package.json', (j) => { j.version = semver; });

// Web package.json
updateJson('apps/web/package.json', (j) => { j.version = semver; });

// API package.json
updateJson('packages/api/package.json', (j) => { j.version = semver; });

// Shared package.json (if exists)
updateJson('shared/package.json', (j) => { j.version = semver; });

console.log(`Version code: ${versionCode}`);
console.log('Done.');
