// 颜色配置模块
const baseColors = {
  // 自定义颜色
  466580: '#466580',
  818182: '#818182',
  595959: '#595959',
  333333: '#333333',
  666666: '#666666',
  fffffe: '#fffffe',
  B10A32: '#B10A32',
  f4: '#F4F4F4',
  cc: '#CCCCCC',

  // 基础颜色
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // 灰度色
  slate: '#64748b',
  gray: '#6b7280',
  gray1: '',
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

module.exports = {
  baseColors,

  // 颜色相关的class配置
  colorClasses: {
    color: {
      ABBR: 'color',
    },
    bg: {
      ABBR: 'background-color',
    },
    bcolor: {
      ABBR: 'border-color',
    },
  },
};
