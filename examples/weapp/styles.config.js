// ========== 样式规则配置（小程序示例）==========
// 说明：
// - 该示例更偏向小程序（rpx），你可以直接复制到项目根目录使用
// - 如需 Web 示例（px），请参考 examples/web/styles.config.js

const DEFAULT_UNIT = 'rpx';

// ========== 原子化规则配置 ==========
const atomicRules = {
  spacing: {
    m: { properties: ['margin'], defaultUnit: DEFAULT_UNIT },
    mt: { properties: ['margin-top'], defaultUnit: DEFAULT_UNIT },
    mr: { properties: ['margin-right'], defaultUnit: DEFAULT_UNIT },
    mb: { properties: ['margin-bottom'], defaultUnit: DEFAULT_UNIT },
    ml: { properties: ['margin-left'], defaultUnit: DEFAULT_UNIT },
    mx: { properties: ['margin-left', 'margin-right'], defaultUnit: DEFAULT_UNIT },
    my: { properties: ['margin-top', 'margin-bottom'], defaultUnit: DEFAULT_UNIT },
    p: { properties: ['padding'], defaultUnit: DEFAULT_UNIT },
    pt: { properties: ['padding-top'], defaultUnit: DEFAULT_UNIT },
    pr: { properties: ['padding-right'], defaultUnit: DEFAULT_UNIT },
    pb: { properties: ['padding-bottom'], defaultUnit: DEFAULT_UNIT },
    pl: { properties: ['padding-left'], defaultUnit: DEFAULT_UNIT },
    px: { properties: ['padding-left', 'padding-right'], defaultUnit: DEFAULT_UNIT },
    py: { properties: ['padding-top', 'padding-bottom'], defaultUnit: DEFAULT_UNIT },
    gap: { properties: ['gap'], defaultUnit: DEFAULT_UNIT },
  },
  sizing: {
    w: { properties: ['width'], defaultUnit: DEFAULT_UNIT },
    h: { properties: ['height'], defaultUnit: DEFAULT_UNIT },
    'max-w': { properties: ['max-width'], defaultUnit: DEFAULT_UNIT },
    'max-h': { properties: ['max-height'], defaultUnit: DEFAULT_UNIT },
    'min-w': { properties: ['min-width'], defaultUnit: DEFAULT_UNIT },
    'min-h': { properties: ['min-height'], defaultUnit: DEFAULT_UNIT },
    size: { properties: ['width', 'height'], defaultUnit: DEFAULT_UNIT },
  },
  typography: {
    'text-size': { properties: ['font-size'], defaultUnit: DEFAULT_UNIT },
    text: { properties: ['font-size'], defaultUnit: DEFAULT_UNIT },
    font: { properties: ['font-weight'], defaultUnit: '' },
    leading: { properties: ['line-height'], defaultUnit: '' },
    tracking: { properties: ['letter-spacing'], defaultUnit: DEFAULT_UNIT },
  },
  positioning: {
    top: { properties: ['top'], defaultUnit: DEFAULT_UNIT },
    right: { properties: ['right'], defaultUnit: DEFAULT_UNIT },
    bottom: { properties: ['bottom'], defaultUnit: DEFAULT_UNIT },
    left: { properties: ['left'], defaultUnit: DEFAULT_UNIT },
    inset: { properties: ['top', 'right', 'bottom', 'left'], defaultUnit: DEFAULT_UNIT },
    'inset-x': { properties: ['left', 'right'], defaultUnit: DEFAULT_UNIT },
    'inset-y': { properties: ['top', 'bottom'], defaultUnit: DEFAULT_UNIT },
  },
  borders: {
    rounded: { properties: ['border-radius'], defaultUnit: DEFAULT_UNIT },
    border: { properties: ['border-width'], defaultUnit: DEFAULT_UNIT },
    bordert: { properties: ['border-top-width'], defaultUnit: DEFAULT_UNIT },
    borderr: { properties: ['border-right-width'], defaultUnit: DEFAULT_UNIT },
    borderb: { properties: ['border-bottom-width'], defaultUnit: DEFAULT_UNIT },
    borderl: { properties: ['border-left-width'], defaultUnit: DEFAULT_UNIT },
    b_r: { properties: ['border-radius'], defaultUnit: DEFAULT_UNIT },
  },
  effects: {
    opacity: { properties: ['opacity'], defaultUnit: '' },
    transition: { properties: ['transition'], defaultUnit: 'ms', skipConversion: true },
    op: { properties: ['opacity'], defaultUnit: '' },
    z: { properties: ['z-index'], defaultUnit: '' },
  },
};

// ========== Tailwind 风格静态 class 配置 ==========
const baseClassName = {
  // 颜色族（会在下面把 baseColor 注入进来）
  color: { ABBR: 'color' },
  bg: { ABBR: 'background-color' },
  bcolor: { ABBR: 'border-color' },

  // display / layout
  block: 'display: block;',
  inline: 'display: inline;',
  'inline-block': 'display: inline-block;',
  flex: 'display: flex;',
  'inline-flex': 'display: inline-flex;',
  grid: 'display: grid;',
  'inline-grid': 'display: inline-grid;',
  table: 'display: table;',
  hidden: 'display: none;',

  // sizing
  'w-full': 'width: 100%;',
  'h-full': 'height: 100%;',
  'w-screen': 'width: 100vw;',
  'h-screen': 'height: 100vh;',

  // flex helpers
  'flex-1': 'flex: 1;',
  'shrink-0': 'flex-shrink: 0;',
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
  // 注意：不包含 display:flex，通常配合 `flex` 一起用
  'flex-cen': 'align-items: center;justify-content: center;',

  // position
  static: 'position: static;',
  fixed: 'position: fixed;',
  absolute: 'position: absolute;',
  relative: 'position: relative;',
  sticky: 'position: sticky;',

  // overflow
  'overflow-auto': 'overflow: auto;',
  'overflow-hidden': 'overflow: hidden;',
  'overflow-visible': 'overflow: visible;',
  'overflow-scroll': 'overflow: scroll;',

  // text
  underline: 'text-decoration: underline;',
  'line-through': 'text-decoration: line-through;',
  ellipsis: 'overflow: hidden;text-overflow: ellipsis;white-space: nowrap;',
  'text-left': 'text-align: left;',
  'text-center': 'text-align: center;',
  'text-right': 'text-align: right;',
  'text-justify': 'text-align: justify;',

  // box
  'box-border': 'box-sizing: border-box;',
  'box-content': 'box-sizing: content-box;',

  // border styles
  'border-solid': 'border-style: solid;',
  'border-dashed': 'border-style: dashed;',
  'border-dotted': 'border-style: dotted;',
  'border-none': 'border: none;',
};

// ========== 变体规则（响应式、伪类等） ==========
const variants = {
  responsive: ['sm', 'md', 'lg', 'xl', '2xl'],
  states: ['hover', 'focus', 'active', 'disabled', 'first', 'last', 'odd', 'even'],
  darkMode: ['dark'],
};

// ========== 响应式断点配置（可选） ==========
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ========== 颜色配置（示例，可按项目裁剪） ==========
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

// ========== Important 标识配置 ==========
const importantFlags = {
  // prefix: ['!', '$$'],
  suffix: ['-i', '_i'],
  // custom: ['--important'],
};

function processStyles() {
  const processedBaseClassName = { ...baseClassName };

  // 将颜色 token 合并到具有 ABBR 的类族中（color/bg/bcolor）
  Object.values(processedBaseClassName).forEach((item) => {
    if (item && item.ABBR) {
      Object.assign(item, baseColor);
    }
  });

  return {
    atomicRules,
    baseClassName: processedBaseClassName,
    variants,
    breakpoints,
    importantFlags,
  };
}

module.exports = processStyles();
