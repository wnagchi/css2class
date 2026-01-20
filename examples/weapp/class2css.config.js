// ========== 工具配置（小程序示例）==========
// 用法：
// 1) 推荐直接复制 `examples/weapp` 目录到你的项目根目录
// 2) 然后执行：`class2css -c ./examples/weapp/class2css.config.js`
// 3) 或者把本文件重命名为根目录的 `class2css.config.js`，即可用默认配置启动

const path = require('path');
const stylesConfig = require('./styles.config.js');

module.exports = {
  system: {
    cssFormat: 'compressed', // 'multiLine' | 'singleLine' | 'compressed'
    baseUnit: 'rpx',
    unitConversion: 2,
    compression: true,
    sortClasses: true,
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

  // 单文件输出（非 multiFile 模式时使用；当前版本运行时通常会走 multiFile）
  output: {
    path: path.join(__dirname, 'dist'),
    fileName: 'styles.wxss',
    // commonCssPath: './common.css', // 可选：公共基础样式（相对路径基于配置文件所在目录）
  },

  importantFlags: stylesConfig.importantFlags,

  // 当前版本建议启用 multiFile（用于扫描/监听入口 + 输出策略）
  multiFile: {
    entry: {
      // 扫描/监听入口：string | string[]
      // 注意：工具内部会直接按“运行目录”解释相对路径，因此示例这里显式转绝对路径，保证开箱即用
      path: path.join(__dirname, 'src'),
      // 小程序：wxml；同时支持 html（便于混合模板或组件库）
      fileType: ['wxml', 'html'],
    },
    output: {
      // uniFile：统一输出单文件；filePath：输出到每个文件同目录（同名）
      cssOutType: 'uniFile',
      path: path.join(__dirname, 'dist'),
      fileName: 'styles.wxss',
      fileType: 'wxss', // cssOutType=filePath 时生效

      // 增量模式（可选）：只增不删（大型项目可开启）
      incrementalOnlyAdd: false,
      incrementalBaseline: 'fromOutputFile',
      rebuildOnStart: true,
      unusedReportLimit: 200,

      // uniFile 写入策略（可选）：'rewrite' | 'appendDelta'
      uniFileWriteMode: 'rewrite',
    },
  },

  atomicRules: stylesConfig.atomicRules,
  baseClassName: stylesConfig.baseClassName,
  variants: stylesConfig.variants,
  breakpoints: stylesConfig.breakpoints,
};
