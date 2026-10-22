const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo for changes
config.watchFolders = [monorepoRoot];

// Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Hierarchical lookup stays ON (Expo default): packages like reanimated
// resolve their own nested deps (semver@7) instead of the hoisted semver@6.

// Keep the crawler/watcher out of non-source trees under the monorepo root:
// .muse holds full repo worktrees (~170k files) and the web build output
// churns constantly — crawling them stalled Metro and got it killed.
const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${esc(path.join(monorepoRoot, '.muse'))}/.*`),
  new RegExp(`^${esc(path.join(monorepoRoot, 'apps/web/.next'))}/.*`),
  new RegExp(`^${esc(path.join(projectRoot, 'dist'))}/.*`),
];

module.exports = config;
