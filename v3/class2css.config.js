// 简化的JavaScript配置文件，用于测试
const config = {
  system: {
    baseUnit: 'rpx',
    unitConversion: 2,
    compression: true,
    unitStrategy: {
      autoDetect: true,
      propertyUnits: {
        'font-size': 'rpx',
        'width|height': 'rpx',
        opacity: '',
        'z-index': '',
        'line-height': '',
        'border-radius': 'rpx',
      },
    },
  },

  output: {
    path: './dist',
    fileName: 'styles.wxss',
  },

  importantFlags: {
    suffix: ['-i', '_i'],
  },

  multiFile: {
    entry: {
      path: './src',
      fileType: ['html', 'wxml', 'ts'],
    },
    output: {
      cssOutType: 'uniFile',
      path: './dist',
      fileName: 'index.wxss',
      fileType: 'wxss',
    },
  },

  atomicRules: {
    spacing: {
      m: { properties: ['margin'], defaultUnit: 'rpx' },
      p: { properties: ['padding'], defaultUnit: 'rpx' },
    },
    sizing: {
      w: { properties: ['width'], defaultUnit: 'rpx' },
      h: { properties: ['height'], defaultUnit: 'rpx' },
    },
    typography: {
      text: { properties: ['font-size'], defaultUnit: 'rpx' },
    },
  },

  baseClassName: {
    flex: 'display: flex;',
    'flex-center': 'display: flex; justify-content: center; align-items: center;',
    hidden: 'display: none;',
  },

  variants: {
    responsive: ['sm', 'md', 'lg'],
    states: ['hover', 'focus'],
    darkMode: ['dark'],
  },
};

module.exports = config;