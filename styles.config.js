// ========== 样式规则配置文件 ==========
// 此文件包含所有样式解析规则配置，与工具配置分离

// ========== 原子化规则配置 ==========
const atomicRules = {
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
};

// ========== Tailwind风格的基础class配置 ==========
const baseClassName = {
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
  "font-runyuan": "font-family: 'HYRunYuan-BOLD';",
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
  "grid-cols-4": "grid-template-columns: repeat(4, 1fr);",
  "grid-cols-2": "grid-template-columns: repeat(2, 1fr);",
  "grid-cols-3": "grid-template-columns: repeat(3, 1fr);",
  "grid-cols-5": "grid-template-columns: repeat(5, 1fr);",
  "grid-cols-6": "grid-template-columns: repeat(6, 1fr);",
  "grid-cols-7": "grid-template-columns: repeat(7, 1fr);",
  "grid-cols-8": "grid-template-columns: repeat(8, 1fr);",
  "grid-cols-9": "grid-template-columns: repeat(9, 1fr);",
  "grid-cols-10": "grid-template-columns: repeat(10, 1fr);",
  "static": "position: static;",
  "fixed": "position: fixed;",
  "absolute": "position: absolute;",
  "relative": "position: relative;",
  "sticky": "position: sticky;",
  "overflow-auto": "overflow: auto;",
  "overflow-hidden": "overflow: hidden;",
  "overflow-visible": "overflow: visible;",
  "overflow-scroll": "overflow: scroll;",
  "overflow-x-auto": "overflow-x: auto;",
  "overflow-x-hidden": "overflow-x: hidden;",
  "overflow-x-scroll": "overflow-x: scroll;",
  "overflow-y-auto": "overflow-y: auto;",
  "overflow-y-hidden": "overflow-y: hidden;",
  "overflow-y-scroll": "overflow-y: scroll;",
  "bold-thin": "font-weight: 100;",
  "bold-extralight": "font-weight: 200;",
  "bold-light": "font-weight: 300;",
  "bold-normal": "font-weight: 400;",
  "bold-medium": "font-weight: 500;",
  "bold-semibold": "font-weight: 600;",
  "bold-bold": "font-weight: 700;",
  "bold-extrabold": "font-weight: 800;",
  "bold-black": "font-weight: 900;",
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
  "border-none": "border: none;",
  "bold": "font-weight: bold;"
};

// ========== 变体规则（响应式、伪类等） ==========
const variants = {
  "responsive": ["sm", "md", "lg", "xl", "2xl"],
  "states": ["hover", "focus", "active", "disabled", "first", "last", "odd", "even"],
  "darkMode": ["dark"]
};

// ========== 响应式断点配置（可选） ==========
// 如果不配置，将使用默认 Tailwind 断点值
const breakpoints = {
  sm: '640px',   // 小屏幕（手机横屏）
  md: '768px',   // 中等屏幕（平板）
  lg: '1024px',  // 大屏幕（笔记本）
  xl: '1280px',  // 超大屏幕（桌面）
  '2xl': '1536px' // 超超大屏幕（大桌面）
};

// ========== 颜色配置 ==========
const baseColor = {
  "466580": "#466580",
  "818182": "#818182",
  "595959": "#595959",
  "333333": "#333333",
  "666666": "#666666",
  "979797": "#979797",
  "777777": "#777777",
  "142640": "#142640",
  "fafafa": "#fafafa",
  "B3B3B3": "#B3B3B3",
  "F9F9F9": "#F9F9F9",
  "9CA6B4": "#9CA6B4",
  "040404": "#040404",
  "ECF5FF": "#ECF5FF",
  "black07": "rgba(0,0,0,0.7)",
  "fffffe": "#fffffe",
  "B10A32": "#B10A32",
  "f4": "#F4F4F4",
  "f4f4f4": "#f4f4f4",
  "cc": "#CCCCCC",
  "white": "#ffffff",
  "black": "#000000",
  "transparent": "transparent",
  "slate": "#64748b",
  "gray": "#6b7280",
  "gray1": "",
  "gray4": "#CCCCCC",
  "zinc": "#71717a",
  "red": "#ef4444",
  "orange": "#f97316",
  "amber": "#f59e0b",
  "yellow": "#eab308",
  "lime": "#84cc16",
  "green": "#22c55e",
  "emerald": "#10b981",
  "teal": "#14b8a6",
  "cyan": "#06b6d4",
  "sky": "#0ea5e9",
  "blue": "#142640",
  "indigo": "#6366f1",
  "violet": "#8b5cf6",
  "purple": "#a855f7",
  "fuchsia": "#d946ef",
  "pink": "#ec4899",
  "rose": "#f43f5e"
};

// ========== Important标识配置 ==========
const importantFlags = {
  // prefix: ['!', '$$'],                    // 前缀标识: !w-100, $$w-100
  suffix: ['-i', '_i'], // 后缀标识: w-100_i, w-100-i, w-100__imp
  // custom: ['--important', '##IMP##']      // 自定义标识: w--important-100, w##IMP##-100
};

// 处理颜色配置：将 baseColor 合并到 baseClassName 中具有 ABBR 属性的项
function processStyles() {
  const processedBaseClassName = { ...baseClassName };
  
  // 将颜色配置合并到具有 ABBR 的类中
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
