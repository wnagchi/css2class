const config = {
  // ========== 系统基础配置 ==========
  system: {
    // 基础单位设置
    cssFormat: 'compressed', // 'multiLine' | 'singleLine' | 'compressed'
    baseUnit: 'rpx',
    // 单位转换比例 生成样式单位=设置单位*比例
    unitConversion: 2,
    // 是否压缩CSS
    compression: true,
    // 是否对生成的CSS类进行字母排序
    sortClasses: true, // true | false，启用后会将CSS规则按选择器名称进行字母排序
    // 智能单位处理策略
    unitStrategy: {
      // 自动检测：如果用户写了单位，保持原单位；如果没写，使用默认单位
      autoDetect: true,
      // 属性默认单位映射
      propertyUnits: {
        'font-size': 'rpx',
        'width|height': 'rpx',
        opacity: '', // 无单位
        'z-index': '', // 无单位
        'line-height': '', // 可以无单位
        'border-radius': 'rpx',
      },
    },
  },

  // ========== 输出配置 ==========
  output: {
    //文件输出目录
    path: 'D:/code/membership-weapp/subpackages/portal/lib',
    // 输出文件信息 可设置文件名，扩展名
    fileName: 'commom12.wxss',
    commonCssPath: 'D:/code/css2class/v3dev/common.css', // 共用CSS文件路径
  },

  // ========== Important标识配置 ==========
  importantFlags: {
    // prefix: ['!', '$$'],                    // 前缀标识: !w-100, $$w-100
    suffix: ['-i', '_i'], // 后缀标识: w-100_i, w-100-i, w-100__imp
    // custom: ['--important', '##IMP##']      // 自定义标识: w--important-100, w##IMP##-100
  },
  // 多文件构建 如果存在该字段 则覆盖 cssOutPath fileName
  multiFile: {
    entry: {
      // 监听文件的目录
      path: 'D:/code/membership-weapp/subpackages/portal',
      // 需要监听的文件名
      // fileName:[
      //     'index1.html'
      // ],
      // 文件类型 需要监听的文件扩展名用逗号隔开
      fileType: ['html', 'wxml'],
    },
    // 多文件监听时的导出配置
    output: {
      // css文件导出目录
      // filePath：将css文件导出到监听文件对应的目录下，并且生成同名的样式文件
      //uniFile:将所有样式导出到单文件中
      cssOutType: 'uniFile',
      //文件输出目录
      // 如果填写该目录 css文件就会生成到该目录下
      path: 'D:/code/membership-weapp/subpackages/portal/lib',
      // 输出文件名 cssOutType为uniFile的情况下生效
      fileName: 'index.wxss',
      // 输出文件格式 在cssOutType为filePath的情况下生效
      fileType: 'wxss',
    },
  },

  // ========== 原子化规则配置 ==========
  atomicRules: {
    // 间距系统
    spacing: {
      // Margin - 支持现有的 m-10, mt-20 等写法
      m: { properties: ['margin'], defaultUnit: 'rpx' },
      mt: { properties: ['margin-top'], defaultUnit: 'rpx' },
      mr: { properties: ['margin-right'], defaultUnit: 'rpx' },
      mb: { properties: ['margin-bottom'], defaultUnit: 'rpx' },
      ml: { properties: ['margin-left'], defaultUnit: 'rpx' },
      mx: { properties: ['margin-left', 'margin-right'], defaultUnit: 'rpx' },
      my: { properties: ['margin-top', 'margin-bottom'], defaultUnit: 'rpx' },

      // Padding - 支持现有的 p-10, pt-20 等写法
      p: { properties: ['padding'], defaultUnit: 'rpx' },
      pt: { properties: ['padding-top'], defaultUnit: 'rpx' },
      pr: { properties: ['padding-right'], defaultUnit: 'rpx' },
      pb: { properties: ['padding-bottom'], defaultUnit: 'rpx' },
      pl: { properties: ['padding-left'], defaultUnit: 'rpx' },
      px: { properties: ['padding-left', 'padding-right'], defaultUnit: 'rpx' },
      py: { properties: ['padding-top', 'padding-bottom'], defaultUnit: 'rpx' },

      // Gap
      gap: { properties: ['gap'], defaultUnit: 'rpx' },
    },

    // 尺寸系统
    sizing: {
      w: { properties: ['width'], defaultUnit: 'rpx' },
      h: { properties: ['height'], defaultUnit: 'rpx' },
      'max-w': { properties: ['max-width'], defaultUnit: 'rpx' },
      'max-h': { properties: ['max-height'], defaultUnit: 'rpx' },
      'min-w': { properties: ['min-width'], defaultUnit: 'rpx' },
      'min-h': { properties: ['min-height'], defaultUnit: 'rpx' },
      // 保持现有size用法兼容
      size: { properties: ['width', 'height'], defaultUnit: 'rpx' },
    },

    // 字体系统 - 解决text冲突
    typography: {
      // 新的明确命名，避免冲突
      'text-size': { properties: ['font-size'], defaultUnit: 'rpx' },
      // 保持兼容的别名
      text: { properties: ['font-size'], defaultUnit: 'rpx' },
      font: { properties: ['font-weight'], defaultUnit: '' },
      leading: { properties: ['line-height'], defaultUnit: '' },
      tracking: { properties: ['letter-spacing'], defaultUnit: 'rpx' },
    },

    // 定位系统
    positioning: {
      top: { properties: ['top'], defaultUnit: 'rpx' },
      right: { properties: ['right'], defaultUnit: 'rpx' },
      bottom: { properties: ['bottom'], defaultUnit: 'rpx' },
      left: { properties: ['left'], defaultUnit: 'rpx' },
      inset: { properties: ['top', 'right', 'bottom', 'left'], defaultUnit: 'rpx' },
      'inset-x': { properties: ['left', 'right'], defaultUnit: 'rpx' },
      'inset-y': { properties: ['top', 'bottom'], defaultUnit: 'rpx' },
    },

    // 边框系统
    borders: {
      rounded: { properties: ['border-radius'], defaultUnit: 'rpx' },
      border: { properties: ['border-width'], defaultUnit: 'rpx' },
      bordert: { properties: ['border-top-width'], defaultUnit: 'rpx' },
      borderr: { properties: ['border-right-width'], defaultUnit: 'rpx' },
      borderb: { properties: ['border-bottom-width'], defaultUnit: 'rpx' },
      borderl: { properties: ['border-left-width'], defaultUnit: 'rpx' },
      // 保持兼容的别名
      b_r: { properties: ['border-radius'], defaultUnit: 'rpx' },
    },

    // 效果系统
    effects: {
      opacity: { properties: ['opacity'], defaultUnit: '' },
      transition: { properties: ['transition'], defaultUnit: 'ms', skipConversion: true },
      // 保持兼容的别名
      op: { properties: ['opacity'], defaultUnit: '' },
      z: { properties: ['z-index'], defaultUnit: '' },
    },
  },

  // ========== Tailwind风格的基础class配置 ==========
  baseClassName: {
    // 颜色 - Tailwind风格
    color: {
      ABBR: 'color',
    },

    bg: {
      ABBR: 'background-color',
    },
    bcolor: {
      ABBR: 'border-color',
    },
    // 显示 - Tailwind风格
    block: 'display: block;',
    inline: 'display: inline;',
    'inline-block': 'display: inline-block;',
    flex: 'display: flex;',
    'flex-1': 'flex: 1;',
    'shrink-0': 'flex-shrink: 0;',
    'inline-flex': 'display: inline-flex;',
    grid: 'display: grid;',
    'inline-grid': 'display: inline-grid;',
    table: 'display: table;',
    hidden: 'display: none;',
    'w-full': 'width: 100%;',
    'h-full': 'height: 100%;',
    'w-screen': 'width: 100vw;',
    'h-screen': 'height: 100vh;',
    'font-runyuan': "font-family: 'HYRunYuan-BOLD';",

    // Flexbox - Tailwind风格
    'flex-cen': 'align-items: center;justify-content: center;',
    'flex-row': 'flex-direction: row;',
    'flex-col': 'flex-direction: column;',
    'flex-wrap': 'flex-wrap: wrap;',
    'flex-nowrap': 'flex-wrap: nowrap;',
    'items-start': 'align-items: flex-start;',
    'items-center': 'align-items: center;',
    'items-end': 'align-items: flex-end;',
    'items-stretch': 'align-items: stretch;',
    'justify-start': 'justify-content: flex-start;',
    'justify-center': 'justify-content: center;',
    'justify-end': 'justify-content: flex-end;',
    'justify-between': 'justify-content: space-between;',
    'justify-around': 'justify-content: space-around;',
    'justify-evenly': 'justify-content: space-evenly;',

    'grid-cols-4': 'grid-template-columns: repeat(4, 1fr);',
    'grid-cols-2': 'grid-template-columns: repeat(2, 1fr);',
    'grid-cols-3': 'grid-template-columns: repeat(3, 1fr);',
    'grid-cols-5': 'grid-template-columns: repeat(5, 1fr);',
    'grid-cols-6': 'grid-template-columns: repeat(6, 1fr);',
    'grid-cols-7': 'grid-template-columns: repeat(7, 1fr);',
    'grid-cols-8': 'grid-template-columns: repeat(8, 1fr);',
    'grid-cols-9': 'grid-template-columns: repeat(9, 1fr);',
    'grid-cols-10': 'grid-template-columns: repeat(10, 1fr);',

    // 定位 - Tailwind风格
    static: 'position: static;',
    fixed: 'position: fixed;',
    absolute: 'position: absolute;',
    relative: 'position: relative;',
    sticky: 'position: sticky;',

    // 溢出 - Tailwind风格
    'overflow-auto': 'overflow: auto;',
    'overflow-hidden': 'overflow: hidden;',
    'overflow-visible': 'overflow: visible;',
    'overflow-scroll': 'overflow: scroll;',
    'overflow-x-auto': 'overflow-x: auto;',
    'overflow-x-hidden': 'overflow-x: hidden;',
    'overflow-x-scroll': 'overflow-x: scroll;',
    'overflow-y-auto': 'overflow-y: auto;',
    'overflow-y-hidden': 'overflow-y: hidden;',
    'overflow-y-scroll': 'overflow-y: scroll;',

    // 字体 - Tailwind风格
    'bold-thin': 'font-weight: 100;',
    'bold-extralight': 'font-weight: 200;',
    'bold-light': 'font-weight: 300;',
    'bold-normal': 'font-weight: 400;',
    'bold-medium': 'font-weight: 500;',
    'bold-semibold': 'font-weight: 600;',
    'bold-bold': 'font-weight: 700;',
    'bold-extrabold': 'font-weight: 800;',
    'bold-black': 'font-weight: 900;',

    underline: 'text-decoration: underline;',
    'line-through': 'text-decoration: line-through;',

    ellipsis: 'overflow: hidden;text-overflow: ellipsis;white-space: nowrap;',

    // 文本对齐 - Tailwind风格
    'text-left': 'text-align: left;',
    'text-center': 'text-align: center;',
    'text-right': 'text-align: right;',
    'text-justify': 'text-align: justify;',

    // 光标 - Tailwind风格
    'cursor-auto': 'cursor: auto;',
    'cursor-default': 'cursor: default;',
    'cursor-pointer': 'cursor: pointer;',
    'cursor-wait': 'cursor: wait;',
    'cursor-text': 'cursor: text;',
    'cursor-move': 'cursor: move;',
    'cursor-not-allowed': 'cursor: not-allowed;',

    // 盒模型 - Tailwind风格
    'box-border': 'box-sizing: border-box;',
    'box-content': 'box-sizing: content-box;',

    // 边框 - Tailwind风格
    'border-solid': 'border-style: solid;',
    'border-dashed': 'border-style: dashed;',
    'border-dotted': 'border-style: dotted;',
    'border-none': 'border: none;',

    bold: 'font-weight: bold;',
  },

  // 变体规则（响应式、伪类等）- 增强版
  variants: {
    responsive: ['sm', 'md', 'lg', 'xl', '2xl'],
    states: ['hover', 'focus', 'active', 'disabled', 'first', 'last', 'odd', 'even'],
    darkMode: ['dark'],
  },
};

const baseColor = {
  // 自定义颜色
  466580: '#466580',
  818182: '#818182',
  595959: '#595959',
  333333: '#333333',
  666666: '#666666',
  979797: '#979797',
  818182: '#818182',
  777777: '#777777',
  142640: '#142640',
  fafafa: '#fafafa',
  B3B3B3: '#B3B3B3',
  "F9F9F9": '#F9F9F9',
  '9CA6B4': '#9CA6B4',
  '040404': '#040404',
  'ECF5FF': '#ECF5FF',
  black07: 'rgba(0,0,0,0.7)',
  fffffe: '#fffffe',
  B10A32: '#B10A32',
  f4: '#F4F4F4',
  'f4f4f4': '#f4f4f4',
  cc: '#CCCCCC',

  // 基础颜色
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // 灰度色
  slate: '#64748b',
  gray: '#6b7280',
  gray1: '',
  gray4: '#CCCCCC',
  zinc: '#71717a',

  // 暖色系
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',

  // 冷色系
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#142640',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
};
function getConfig() {
  const handleClass = config.baseClassName;
  Object.values(handleClass).forEach((item) => {
    if (item.ABBR) {
      item = Object.assign(item, baseColor);
    }
  });
  return config;
}
module.exports = getConfig();
