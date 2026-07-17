// Metro config for Expo + monorepo.
// Ensures shared/ and root node_modules are watched for HMR, and hoisted
// dependencies resolve correctly.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedPath = path.resolve(monorepoRoot, 'shared');

const config = getDefaultConfig(projectRoot);

// 1. Watch monorepo root so changes in shared/ trigger HMR.
config.watchFolders = [
  ...(config.watchFolders || []),
  monorepoRoot,
  sharedPath,
];

// 2. Resolve hoisted node_modules from monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Resolve @wordbase/shared directly to source (avoids symlink issues
//    where Metro doesn't follow workspace symlinks for HMR).
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@wordbase/shared': sharedPath,
};

// Ensure we can resolve TS/TSX files from outside projectRoot.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
