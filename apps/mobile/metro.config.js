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

// Add the monorepo root as a possible root
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
