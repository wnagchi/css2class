# 配置模板（可复制）

本页把仓库里的 `class2css.config.js`（你现在已经跑通、并且覆盖了当前支持能力）整理成一份**可直接复制**的模板，避免开发者每个项目都从零拼配置。

:::warning 先改 3 个地方就能跑
- `output.path` / `output.fileName`：输出位置与文件名
- `multiFile.entry.path`：要扫描/监听的源码目录
- `multiFile.output.path` / `multiFile.output.fileName`：统一输出文件位置（`cssOutType='uniFile'` 时）
:::

## 全功能模板（推荐直接复制）

```js
const config = {
  // ========== 系统基础配置 ==========
  system: {
    // CSS 输出格式: 'multiLine' | 'singleLine' | 'compressed'
    cssFormat: 'compressed',
    // 基础单位设置
    baseUnit: 'rpx',
    // 单位转换比例：生成样式单位 = 设置单位 × 比例
    unitConversion: 2,
    // 是否压缩CSS
    compression: true,
    // 是否对生成的CSS类进行字母排序（按选择器名称）
    sortClasses: true,
    // 智能单位处理策略（保留配置入口，具体逻辑以当前版本实现为准）
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

  // ========== 输出配置（单文件/非 multiFile 时） ==========
  output: {
    // 输出目录（建议用相对路径，或自行改成绝对路径）
    path: './dist',
    // 输出文件名
    fileName: 'styles.wxss',
    // 共用CSS文件路径（可选）
    commonCssPath: './common.css',
  },

  // ========== Important 标识配置 ==========
  importantFlags: {
    // prefix: ['!', '$$'],                    // 前缀标识: !w-100, $$w-100
    suffix: ['-i', '_i'], // 后缀标识: w-100_i, w-100-i
    // custom: ['--important', '##IMP##']      // 自定义标识
  },

  // ========== 多文件构建（推荐） ==========
  // 如果存在该字段，则以 multiFile.output 为准（覆盖 output.path/fileName 等单文件输出）
  multiFile: {
    entry: {
      // 扫描/监听目录（改成你的项目目录）
      path: './src',
      // 文件类型（WXML/HTML）
      fileType: ['html', 'wxml'],
    },
    output: {
      // filePath：将css文件导出到监听文件对应目录并生成同名样式文件
      // uniFile：将所有样式导出到单文件
      cssOutType: 'uniFile',
      // 输出目录（cssOutType=uniFile 时生效）
      path: './dist',
      // 输出文件名（cssOutType=uniFile 时生效）
      fileName: 'index.wxss',
      // 输出文件扩展名（cssOutType=filePath 时生效）
      fileType: 'wxss',

      // ========== 增量模式（只增不删） ==========
      incrementalOnlyAdd: true,
      incrementalBaseline: 'fromOutputFile',
      rebuildOnStart: true,
      unusedReportLimit: 200,

      // ========== uniFile 写入策略 ==========
      // 'rewrite' | 'appendDelta'
      // 注意：appendDelta 要求 rebuildOnStart=true
      uniFileWriteMode: 'appendDelta',
    },
  },

  // ========== 原子化规则配置 ==========
  atomicRules: {
    "spacing": {
      "m": { "properties": ["margin"], "defaultUnit": "rpx" },
      "mt": { "properties": ["margin-top"], "defaultUnit": "rpx" },
      "mr": { "properties": ["margin-right"], "defaultUnit": "rpx" },
      "mb": { "properties": ["margin-bottom"], "defaultUnit": "rpx" },
      "ml": { "properties": ["margin-left"], "defaultUnit": "rpx" },
      "mx": { "properties": ["margin-left", "margin-right"], "defaultUnit": "rpx" },
      "my": { "properties": ["margin-top", "margin-bottom"], "defaultUnit": "rpx" },
      "p": { "properties": ["padding"], "defaultUnit": "rpx" },
      "pt": { "properties": ["padding-top"], "defaultUnit": "rpx" },
      "pr": { "properties": ["padding-right"], "defaultUnit": "rpx" },
      "pb": { "properties": ["padding-bottom"], "defaultUnit": "rpx" },
      "pl": { "properties": ["padding-left"], "defaultUnit": "rpx" },
      "px": { "properties": ["padding-left", "padding-right"], "defaultUnit": "rpx" },
      "py": { "properties": ["padding-top", "padding-bottom"], "defaultUnit": "rpx" },
      "gap": { "properties": ["gap"], "defaultUnit": "rpx" }
    },
    "sizing": {
      "w": { "properties": ["width"], "defaultUnit": "rpx" },
      "h": { "properties": ["height"], "defaultUnit": "rpx" },
      "max-w": { "properties": ["max-width"], "defaultUnit": "rpx" },
      "max-h": { "properties": ["max-height"], "defaultUnit": "rpx" },
      "min-w": { "properties": ["min-width"], "defaultUnit": "rpx" },
      "min-h": { "properties": ["min-height"], "defaultUnit": "rpx" },
      "size": { "properties": ["width", "height"], "defaultUnit": "rpx" }
    },
    "typography": {
      "text-size": { "properties": ["font-size"], "defaultUnit": "rpx" },
      "text": { "properties": ["font-size"], "defaultUnit": "rpx" },
      "font": { "properties": ["font-weight"], "defaultUnit": "" },
      "leading": { "properties": ["line-height"], "defaultUnit": "" },
      "tracking": { "properties": ["letter-spacing"], "defaultUnit": "rpx" }
    },
    "positioning": {
      "top": { "properties": ["top"], "defaultUnit": "rpx" },
      "right": { "properties": ["right"], "defaultUnit": "rpx" },
      "bottom": { "properties": ["bottom"], "defaultUnit": "rpx" },
      "left": { "properties": ["left"], "defaultUnit": "rpx" },
      "inset": { "properties": ["top", "right", "bottom", "left"], "defaultUnit": "rpx" },
      "inset-x": { "properties": ["left", "right"], "defaultUnit": "rpx" },
      "inset-y": { "properties": ["top", "bottom"], "defaultUnit": "rpx" }
    },
    "borders": {
      "rounded": { "properties": ["border-radius"], "defaultUnit": "rpx" },
      "border": { "properties": ["border-width"], "defaultUnit": "rpx" },
      "bordert": { "properties": ["border-top-width"], "defaultUnit": "rpx" },
      "borderr": { "properties": ["border-right-width"], "defaultUnit": "rpx" },
      "borderb": { "properties": ["border-bottom-width"], "defaultUnit": "rpx" },
      "borderl": { "properties": ["border-left-width"], "defaultUnit": "rpx" },
      "b_r": { "properties": ["border-radius"], "defaultUnit": "rpx" }
    },
    "effects": {
      "opacity": { "properties": ["opacity"], "defaultUnit": "" },
      "transition": { "properties": ["transition"], "defaultUnit": "ms", "skipConversion": true },
      "op": { "properties": ["opacity"], "defaultUnit": "" },
      "z": { "properties": ["z-index"], "defaultUnit": "" }
    }
  },

  // ========== Tailwind 风格静态 class ==========
  // 这里保留“结构”，颜色表建议按自己项目裁剪
  baseClassName: {
    "color": { "ABBR": "color" },
    "bg": { "ABBR": "background-color" },
    "bcolor": { "ABBR": "border-color" },
    "block": "display: block;",
    "inline": "display: inline;",
    "inline-block": "display: inline-block;",
    "flex": "display: flex;",
    "flex-1": "flex: 1;",
    "shrink-0": "flex-shrink: 0;",
    "inline-flex": "display: inline-flex;",
    "grid": "display: grid;",
    "inline-grid": "display: inline-grid;",
    "table": "display: table;",
    "hidden": "display: none;",
    "w-full": "width: 100%;",
    "h-full": "height: 100%;",
    "w-screen": "width: 100vw;",
    "h-screen": "height: 100vh;",
    "flex-cen": "align-items: center;justify-content: center;",
    "flex-row": "flex-direction: row;",
    "flex-col": "flex-direction: column;",
    "flex-wrap": "flex-wrap: wrap;",
    "flex-nowrap": "flex-wrap: nowrap;",
    "items-start": "align-items: flex-start;",
    "items-center": "align-items: center;",
    "items-end": "align-items: flex-end;",
    "items-stretch": "align-items: stretch;",
    "justify-start": "justify-content: flex-start;",
    "justify-center": "justify-content: center;",
    "justify-end": "justify-content: flex-end;",
    "justify-between": "justify-content: space-between;",
    "justify-around": "justify-content: space-around;",
    "justify-evenly": "justify-content: space-evenly;",
    "grid-cols-2": "grid-template-columns: repeat(2, 1fr);",
    "grid-cols-3": "grid-template-columns: repeat(3, 1fr);",
    "grid-cols-4": "grid-template-columns: repeat(4, 1fr);",
    "static": "position: static;",
    "fixed": "position: fixed;",
    "absolute": "position: absolute;",
    "relative": "position: relative;",
    "sticky": "position: sticky;",
    "overflow-auto": "overflow: auto;",
    "overflow-hidden": "overflow: hidden;",
    "overflow-visible": "overflow: visible;",
    "overflow-scroll": "overflow: scroll;",
    "underline": "text-decoration: underline;",
    "line-through": "text-decoration: line-through;",
    "ellipsis": "overflow: hidden;text-overflow: ellipsis;white-space: nowrap;",
    "text-left": "text-align: left;",
    "text-center": "text-align: center;",
    "text-right": "text-align: right;",
    "text-justify": "text-align: justify;",
    "cursor-auto": "cursor: auto;",
    "cursor-default": "cursor: default;",
    "cursor-pointer": "cursor: pointer;",
    "cursor-wait": "cursor: wait;",
    "cursor-text": "cursor: text;",
    "cursor-move": "cursor: move;",
    "cursor-not-allowed": "cursor: not-allowed;",
    "box-border": "box-sizing: border-box;",
    "box-content": "box-sizing: content-box;",
    "border-solid": "border-style: solid;",
    "border-dashed": "border-style: dashed;",
    "border-dotted": "border-style: dotted;",
    "border-none": "border: none;"
  },

  // ========== 变体规则（增强版） ==========
  variants: {
    "responsive": ["sm", "md", "lg", "xl", "2xl"],
    "states": ["hover", "focus", "active", "disabled", "first", "last", "odd", "even"],
    "darkMode": ["dark"]
  },
};

// 颜色表（示例：保留一小部分。建议按项目裁剪/维护）
const baseColor = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  gray: '#6b7280',
  red: '#ef4444',
  green: '#22c55e',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
};

function getConfig() {
  const handleClass = config.baseClassName;
  Object.values(handleClass).forEach((item) => {
    if (item && item.ABBR) {
      Object.assign(item, baseColor);
    }
  });
  return config;
}

module.exports = getConfig();
```

## 下一步

- 想了解“只增不删”与 `appendDelta`：阅读 [增量模式（只增不删）](./incremental.md)
- 想理解单位逻辑：阅读 [单位与转换策略](./units.md)
- 想查当前已内置的类名规则：阅读 [规则参考](./rules-reference.md)

