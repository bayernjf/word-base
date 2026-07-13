#!/usr/bin/env node
/**
 * Inject version number into all package configs before CI build.
 * Usage: node scripts/set-version.cjs <version>
 *   version can be like "1.2.3" or "v1.2.3" or "0.0.0-snapshot"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let version = process.argv[2];
if (!version) {
  console.error('Usage: node set-version.cjs <version>');
  process.exit(1);
}
// Strip leading 'v'
version = version.replace(/^v/, '');

console.log(`Setting version to: ${version}`);

function updateJson(filePath, mutator) {
  const abs = path.resolve(ROOT, filePath);
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  mutator(json);
  fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n');
  console.log(`  updated ${filePath}`);
}

// Root package.json
updateJson('package.json', (j) => { j.version = version; });

// Desktop: Tauri config
updateJson('apps/desktop/src-tauri/tauri.conf.json', (j) => { j.version = version; });

// Desktop: package.json
updateJson('apps/desktop/package.json', (j) => { j.version = version; });

// Desktop: Cargo.toml (simple regex, not full TOML parser)
const cargoPath = path.resolve(ROOT, 'apps/desktop/src-tauri/Cargo.toml');
let cargo = fs.readFileSync(cargoPath, 'utf8');
cargo = cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo);
console.log('  updated apps/desktop/src-tauri/Cargo.toml');

// Mobile: app.json (Expo "version") + buildNumber/versionCode
const [maj, min, pat] = version.split(/[.-]/)[0].split('.').map(n => parseInt(n, 10) || 0);
const versionCode = maj * 10000 + min * 100 + pat;
updateJson('apps/mobile/app.json', (j) => {
  j.expo.version = version;
  j.expo.ios = j.expo.ios || {};
  j.expo.ios.buildNumber = String(versionCode);
  j.expo.android = j.expo.android || {};
  j.expo.android.versionCode = versionCode;
});

// Mobile package.json
updateJson('apps/mobile/package.json', (j) => { j.version = version; });

// Web package.json
updateJson('apps/web/package.json', (j) => { j.version = version; });

// API package.json
updateJson('packages/api/package.json', (j) => { j.version = version; });

// Shared package.json (if exists)
const sharedPkg = path.resolve(ROOT, 'shared/package.json');
if (fs.existsSync(sharedPkg)) {
  updateJson('shared/package.json', (j) => { j.version = version; });
}

console.log('Done.');
