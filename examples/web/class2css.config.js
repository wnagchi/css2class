// ========== 工具配置（Web 示例）==========
// 用法：
// 1) 推荐直接复制 `examples/web` 目录到你的项目根目录
// 2) 然后执行：`class2css -c ./examples/web/class2css.config.js`
// 3) 或者把本文件重命名为根目录的 `class2css.config.js`，即可用默认配置启动
//
// 注意：
// - 当前解析器默认只提取 `class="..."`（适用于 HTML / Vue 模板里的 class）
// - React/JSX 常见的 `className="..."` 当前不会被提取（如需支持可扩展解析器/正则）

const path = require('path');
const stylesConfig = require('./styles.config.js');

module.exports = {
  system: {
    cssFormat: 'compressed',
    baseUnit: 'px',
    unitConversion: 1,
    compression: true,
    sortClasses: true,
    unitStrategy: {
      autoDetect: true,
      propertyUnits: {
        'font-size': 'px',
        'width|height': 'px',
        opacity: '',
        'z-index': '',
        'line-height': '',
        'border-radius': 'px',
      },
    },
  },

  output: {
    path: path.join(__dirname, 'dist'),
    fileName: 'styles.css',
    // commonCssPath: './common.css', // 可选：公共基础样式（相对路径基于配置文件所在目录）
  },

  importantFlags: stylesConfig.importantFlags,

  multiFile: {
    entry: {
      // 注意：工具内部会直接按“运行目录”解释相对路径，因此示例这里显式转绝对路径，保证开箱即用
      // - 扫描 demo.html（可直接在浏览器看到效果）
      // - 同时扫描 src 目录（给你放更多示例文件用）
      path: [path.join(__dirname, 'demo.html'), path.join(__dirname, 'src')],
      // Web：html/vue（你也可以追加 svelte、astro 等模板文件扩展名）
      fileType: ['html', 'vue'],
    },
    output: {
      cssOutType: 'uniFile',
      path: path.join(__dirname, 'dist'),
      fileName: 'styles.css',
      fileType: 'css',

      incrementalOnlyAdd: false,
      incrementalBaseline: 'fromOutputFile',
      rebuildOnStart: true,
      unusedReportLimit: 200,

      uniFileWriteMode: 'rewrite',
    },
  },

  atomicRules: stylesConfig.atomicRules,
  baseClassName: stylesConfig.baseClassName,
  variants: stylesConfig.variants,
  breakpoints: stylesConfig.breakpoints,
};
