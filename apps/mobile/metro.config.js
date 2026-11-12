const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const monorepoRoot = path.resolve(__dirname, '../..');

/** 모노레포: packages/* 의 TS 소스를 직접 번들한다. */
const config = {
  // Only JS workspaces/dependencies; watching the whole repo also watches Unity Library/Builds.
  watchFolders: [path.join(monorepoRoot, 'packages'), path.join(monorepoRoot, 'node_modules')],
  resolver: {
    blockList: [new RegExp(`${__dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?:android|ios)/`)],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
