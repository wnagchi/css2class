/**
 * CSS Optimizer 主入口文件
 */

export { CSSOptimizer } from './css-optimizer';
export { ConfigManager } from './config/config-manager';
export { Utils } from './utils/utils';
export { CacheManager, LRUCache, MultiLevelCache } from './cache/cache-manager';
export { ParserManager, HTMLParser, VueParser, WXMLParser } from './parser/parsers';
export { CSSGenerator } from './generator/css-generator';
export { FileWatcher, WatcherFactory } from './watcher/file-watcher';
export { CSSOptimizerCLI } from './cli';

// 类型导出
export * from './types';

// 默认配置
export const DEFAULT_CONFIG = {
  targetFormats: ['.vue', '.wxml', '.html'],
  colors: {
    customColors: {},
    directColorParsing: true
  },
  units: {
    spacing: {
      defaultUnit: 'px',
      conversions: { px: 1, rpx: 2, rem: 16 }
    },
    fontSize: {
      defaultUnit: 'px',
      conversions: { px: 1, rpx: 2, rem: 16 }
    },
    width: {
      defaultUnit: 'px',
      conversions: { px: 1, rpx: 2, rem: 16 }
    }
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  rules: {
    spacing: {
      margin: ['m', 'mt', 'mr', 'mb', 'ml', 'mx', 'my'],
      padding: ['p', 'pt', 'pr', 'pb', 'pl', 'px', 'py'],
      gap: ['gap', 'gap-x', 'gap-y']
    },
    layout: {
      display: ['block', 'inline', 'inline-block', 'flex', 'grid'],
      flex: ['flex', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap'],
      justify: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around'],
      align: ['items-start', 'items-center', 'items-end', 'items-stretch'],
      position: ['relative', 'absolute', 'fixed', 'sticky']
    },
    colors: {
      background: ['bg'],
      text: ['text'],
      border: ['border', 'border-t', 'border-r', 'border-b', 'border-l']
    },
    fonts: {
      fontSize: ['text'],
      fontWeight: ['font'],
      fontFamily: ['font-family']
    },
    interactions: {
      hover: ['hover:'],
      focus: ['focus:'],
      active: ['active:'],
      disabled: ['disabled:']
    }
  },
  output: {
    outputMode: 'separate',
    cssFileName: 'styles.css',
    minify: false,
    sourceMap: true
  },
  watch: {
    debounceMs: 300,
    enabled: true,
    ignorePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      '**/*.css',
      '**/*.js',
      '**/*.ts'
    ]
  },
  performance: {
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 300000
    },
    parallel: {
      enabled: true,
      maxWorkers: 4
    },
    memoryLimit: '512MB'
  }
};