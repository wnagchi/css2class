# Class2CSS 配置参考文档

本文档详细说明 Class2CSS 的所有配置选项。

## 📋 目录

- [配置文件结构](#配置文件结构)
- [系统配置 (system)](#系统配置-system)
- [输出配置 (output)](#输出配置-output)
- [多文件配置 (multiFile)](#多文件配置-multifile)
- [原子化规则 (atomicRules)](#原子化规则-atomicrules)
- [基础类配置 (baseClassName)](#基础类配置-baseclassname)
- [Important 标识 (importantFlags)](#important-标识-importantflags)
- [变体规则 (variants)](#变体规则-variants)
- [配置示例](#配置示例)
- [最佳实践](#最佳实践)

## 配置文件结构

配置已拆分为两个文件，便于管理和维护：

### 主配置文件：`class2css.config.js`

工具运行相关的配置（系统设置、输出路径等）：

```javascript
// 引入样式规则配置
const stylesConfig = require('./styles.config.js');

module.exports = {
  system: { /* 系统配置 */ },
  output: { /* 输出配置 */ },
  multiFile: { /* 多文件配置 */ },
  importantFlags: stylesConfig.importantFlags,
  atomicRules: stylesConfig.atomicRules,
  baseClassName: stylesConfig.baseClassName,
  variants: stylesConfig.variants,
  breakpoints: stylesConfig.breakpoints
};
```

### 样式规则配置文件：`styles.config.js`

样式解析规则相关的配置（原子化规则、基础类、变体、断点等）：

```javascript
module.exports = {
  atomicRules: { /* 原子化规则 */ },
  baseClassName: { /* 基础类配置 */ },
  variants: { /* 变体规则 */ },
  breakpoints: { /* 响应式断点 */ },
  importantFlags: { /* Important 标识 */ }
};
```

**优势**：
- **关注点分离**：工具配置与样式规则分离，更清晰
- **易于维护**：样式规则集中管理，便于团队协作
- **灵活扩展**：可以轻松替换或扩展样式规则配置

## 系统配置 (system)

系统级别的全局配置。

### 完整配置

```javascript
system: {
  cssFormat: 'compressed',
  baseUnit: 'rpx',
  unitConversion: 2,
  compression: true,
  sortClasses: true,
  unitStrategy: {
    autoDetect: true,
    propertyUnits: {
      'font-size': 'rpx',
      'width|height': 'rpx',
      'opacity': '',
      'z-index': '',
      'line-height': '',
      'border-radius': 'rpx'
    }
  }
}
```

### 配置项说明

#### cssFormat

**类型**: `string`  
**默认值**: `'compressed'`  
**可选值**: `'multiLine'` | `'singleLine'` | `'compressed'`

CSS 输出格式。

```javascript
// multiLine - 多行格式
.m-10 {
  margin: 20rpx;
}

// singleLine - 单行格式
.m-10 { margin: 20rpx; }

// compressed - 压缩格式
.m-10{margin:20rpx}
```

#### baseUnit

**类型**: `string`  
**默认值**: `'rpx'`  
**常用值**: `'rpx'` | `'px'` | `'rem'` | `'em'`

基础单位，用于没有指定单位的数值。

```javascript
baseUnit: 'rpx'

// 使用效果
// class="m-10" → margin: 20rpx;
// class="m-10px" → margin: 10px;
```

#### unitConversion

**类型**: `number`  
**默认值**: `2`

单位转换比例。生成的样式单位 = 设置单位 × 比例。

```javascript
unitConversion: 2

// 使用效果
// class="m-10" → margin: 20rpx; (10 × 2)
// class="w-100" → width: 200rpx; (100 × 2)
```

**常见场景**:
- 设计稿 750px，小程序 750rpx → `unitConversion: 2`
- 设计稿 375px，小程序 750rpx → `unitConversion: 2`
- 1:1 转换 → `unitConversion: 1`

#### compression

**类型**: `boolean`  
**默认值**: `true`

是否压缩 CSS 输出。

```javascript
compression: true  // 推荐生产环境使用
compression: false // 推荐开发环境使用
```

#### sortClasses

**类型**: `boolean`  
**默认值**: `true`

是否对生成的 CSS 类进行字母排序。

```javascript
sortClasses: true

// 生成的 CSS 会按字母顺序排列
.h-100 { ... }
.m-10 { ... }
.p-20 { ... }
.w-100 { ... }
```

#### unitStrategy

**类型**: `object`

智能单位处理策略配置。

##### autoDetect

**类型**: `boolean`  
**默认值**: `true`

是否自动检测用户提供的单位。

```javascript
autoDetect: true

// 效果
// class="m-10" → margin: 20rpx; (使用默认单位)
// class="m-10px" → margin: 10px; (保持用户单位)
// class="m-10em" → margin: 10em; (保持用户单位)
```

##### propertyUnits

**类型**: `object`

为不同 CSS 属性配置默认单位。

```javascript
propertyUnits: {
  'font-size': 'rpx',           // 字体大小使用 rpx
  'width|height': 'rpx',        // 宽高使用 rpx (支持管道符)
  'opacity': '',                // 透明度无单位
  'z-index': '',                // 层级无单位
  'line-height': '',            // 行高可以无单位
  'border-radius': 'rpx'        // 圆角使用 rpx
}
```

**支持的格式**:
- 单个属性: `'font-size': 'rpx'`
- 多个属性: `'width|height': 'rpx'`
- 无单位: `'opacity': ''`

## 输出配置 (output)

单文件输出配置。

```javascript
output: {
  path: './dist',
  fileName: 'styles.wxss',
  commonCssPath: './common.css'
}
```

### 配置项说明

#### path

**类型**: `string`  
**必需**: 是

CSS 文件输出目录。

```javascript
path: './dist'              // 相对路径
path: 'D:/project/dist'     // 绝对路径
```

#### fileName

**类型**: `string`  
**必需**: 是

输出文件名（包含扩展名）。

```javascript
fileName: 'styles.wxss'     // 微信小程序
fileName: 'styles.css'      // 普通 CSS
fileName: 'common.acss'     // 支付宝小程序
```

#### commonCssPath

**类型**: `string`  
**可选**: 是

共用 CSS 文件路径，会在生成的 CSS 文件开头引入。

```javascript
commonCssPath: './common.css'

// 生成的 CSS 文件会包含
@import './common.css';

.m-10 { margin: 20rpx; }
// ...
```

## 多文件配置 (multiFile)

多文件监听和输出配置。

```javascript
multiFile: {
  entry: {
    // 单入口
    // path: './src',
    // 多入口（目录/文件可混用）
    path: ['./src', './subpackages', './pages/index.wxml'],
    fileName: ['index.wxml', 'detail.wxml'],
    fileType: ['html', 'wxml']
  },
  output: {
    cssOutType: 'uniFile',
    path: './dist',
    fileName: 'common.wxss',
    fileType: 'wxss'
  }
}
```

### entry 配置

#### path

**类型**: `string | Array<string>`  
**必需**: 是

扫描/监听入口路径。

- 当为 `string`：表示单目录或单文件
- 当为 `Array<string>`：表示多目录/多文件（目录与文件可混用）

```javascript
path: './src'
path: 'D:/project/src'
path: ['./src', './packages', './pages/index.wxml']
```

#### fileName

**类型**: `Array<string>`  
**可选**: 是

需要监听的特定文件名列表。如果不指定，则监听所有符合 `fileType` 的文件。

```javascript
fileName: ['index.wxml', 'detail.wxml']
```

#### fileType

**类型**: `Array<string>`  
**必需**: 是

需要监听的文件扩展名（不含点号）。

```javascript
fileType: ['html', 'wxml']      // 微信小程序
fileType: ['html', 'axml']      // 支付宝小程序
fileType: ['html', 'vue']       // Vue 项目
```

### output 配置

#### cssOutType

**类型**: `string`  
**必需**: 是  
**可选值**: `'filePath'` | `'uniFile'`

CSS 输出模式。

```javascript
// filePath - 每个源文件生成对应的 CSS 文件
cssOutType: 'filePath'
// src/pages/index.wxml → dist/pages/index.wxss
// src/pages/detail.wxml → dist/pages/detail.wxss

// uniFile - 所有样式合并到一个文件
cssOutType: 'uniFile'
// 所有文件 → dist/common.wxss
```

**对比**:

| 特性 | filePath | uniFile |
|------|----------|---------|
| 文件数量 | 多个 | 单个 |
| 更新方式 | 增量更新 | 全量更新 |
| 适用场景 | 组件化开发 | 统一样式管理 |
| 性能 | 快速 | 防抖优化 |

#### path

**类型**: `string`  
**必需**: 是

CSS 文件输出目录。

```javascript
path: './dist'
```

#### fileName

**类型**: `string`  
**必需**: 当 `cssOutType` 为 `'uniFile'` 时必需

统一输出文件名。

```javascript
fileName: 'common.wxss'  // 仅在 uniFile 模式下使用
```

#### fileType

**类型**: `string`  
**必需**: 当 `cssOutType` 为 `'filePath'` 时必需

输出文件的扩展名（不含点号）。

```javascript
fileType: 'wxss'  // 仅在 filePath 模式下使用
```

## 原子化规则 (atomicRules)

定义原子化 CSS 类的生成规则。

```javascript
atomicRules: {
  spacing: { /* 间距规则 */ },
  sizing: { /* 尺寸规则 */ },
  typography: { /* 字体规则 */ },
  positioning: { /* 定位规则 */ },
  borders: { /* 边框规则 */ },
  effects: { /* 效果规则 */ }
}
```

### 规则格式

```javascript
atomicRules: {
  spacing: {
    m: { 
      properties: ['margin'], 
      defaultUnit: 'rpx' 
    },
    mt: { 
      properties: ['margin-top'], 
      defaultUnit: 'rpx' 
    },
    mx: { 
      properties: ['margin-left', 'margin-right'], 
      defaultUnit: 'rpx' 
    }
  }
}
```

### 配置项说明

#### properties

**类型**: `Array<string>`  
**必需**: 是

CSS 属性列表。支持单个或多个属性。

```javascript
// 单个属性
properties: ['margin']

// 多个属性
properties: ['margin-left', 'margin-right']
```

#### defaultUnit

**类型**: `string`  
**必需**: 是

该规则的默认单位。

```javascript
defaultUnit: 'rpx'   // 使用 rpx
defaultUnit: 'px'    // 使用 px
defaultUnit: ''      // 无单位
```

#### skipConversion

**类型**: `boolean`  
**默认值**: `false`

是否跳过单位转换。

```javascript
{
  properties: ['transition'],
  defaultUnit: 'ms',
  skipConversion: true  // 不进行单位转换
}

// class="transition-300" → transition: 300ms; (不乘以 unitConversion)
```

### 内置规则类别

#### spacing - 间距系统

```javascript
spacing: {
  // Margin
  m: { properties: ['margin'], defaultUnit: 'rpx' },
  mt: { properties: ['margin-top'], defaultUnit: 'rpx' },
  mr: { properties: ['margin-right'], defaultUnit: 'rpx' },
  mb: { properties: ['margin-bottom'], defaultUnit: 'rpx' },
  ml: { properties: ['margin-left'], defaultUnit: 'rpx' },
  mx: { properties: ['margin-left', 'margin-right'], defaultUnit: 'rpx' },
  my: { properties: ['margin-top', 'margin-bottom'], defaultUnit: 'rpx' },

  // Padding
  p: { properties: ['padding'], defaultUnit: 'rpx' },
  pt: { properties: ['padding-top'], defaultUnit: 'rpx' },
  pr: { properties: ['padding-right'], defaultUnit: 'rpx' },
  pb: { properties: ['padding-bottom'], defaultUnit: 'rpx' },
  pl: { properties: ['padding-left'], defaultUnit: 'rpx' },
  px: { properties: ['padding-left', 'padding-right'], defaultUnit: 'rpx' },
  py: { properties: ['padding-top', 'padding-bottom'], defaultUnit: 'rpx' },

  // Gap
  gap: { properties: ['gap'], defaultUnit: 'rpx' }
}
```

#### sizing - 尺寸系统

```javascript
sizing: {
  w: { properties: ['width'], defaultUnit: 'rpx' },
  h: { properties: ['height'], defaultUnit: 'rpx' },
  'max-w': { properties: ['max-width'], defaultUnit: 'rpx' },
  'max-h': { properties: ['max-height'], defaultUnit: 'rpx' },
  'min-w': { properties: ['min-width'], defaultUnit: 'rpx' },
  'min-h': { properties: ['min-height'], defaultUnit: 'rpx' },
  size: { properties: ['width', 'height'], defaultUnit: 'rpx' }
}
```

#### typography - 字体系统

```javascript
typography: {
  'text-size': { properties: ['font-size'], defaultUnit: 'rpx' },
  text: { properties: ['font-size'], defaultUnit: 'rpx' },
  font: { properties: ['font-weight'], defaultUnit: '' },
  leading: { properties: ['line-height'], defaultUnit: '' },
  tracking: { properties: ['letter-spacing'], defaultUnit: 'rpx' }
}
```

#### positioning - 定位系统

```javascript
positioning: {
  top: { properties: ['top'], defaultUnit: 'rpx' },
  right: { properties: ['right'], defaultUnit: 'rpx' },
  bottom: { properties: ['bottom'], defaultUnit: 'rpx' },
  left: { properties: ['left'], defaultUnit: 'rpx' },
  inset: { properties: ['top', 'right', 'bottom', 'left'], defaultUnit: 'rpx' },
  'inset-x': { properties: ['left', 'right'], defaultUnit: 'rpx' },
  'inset-y': { properties: ['top', 'bottom'], defaultUnit: 'rpx' }
}
```

#### borders - 边框系统

```javascript
borders: {
  rounded: { properties: ['border-radius'], defaultUnit: 'rpx' },
  border: { properties: ['border-width'], defaultUnit: 'rpx' },
  bordert: { properties: ['border-top-width'], defaultUnit: 'rpx' },
  borderr: { properties: ['border-right-width'], defaultUnit: 'rpx' },
  borderb: { properties: ['border-bottom-width'], defaultUnit: 'rpx' },
  borderl: { properties: ['border-left-width'], defaultUnit: 'rpx' }
}
```

#### effects - 效果系统

```javascript
effects: {
  opacity: { properties: ['opacity'], defaultUnit: '' },
  z: { properties: ['z-index'], defaultUnit: '' },
  transition: { properties: ['transition'], defaultUnit: 'ms', skipConversion: true }
}
```

## 基础类配置 (baseClassName)

定义静态 CSS 类。

### 基本格式

```javascript
baseClassName: {
  // 简单类
  'flex': 'display: flex;',
  'hidden': 'display: none;',
  
  // 多属性类
  'flex-center': 'display: flex; justify-content: center; align-items: center;',
  
  // 颜色缩写配置
  color: {
    ABBR: 'color'
  },
  bg: {
    ABBR: 'background-color'
  }
}
```

### 使用示例

```html
<!-- 简单类 -->
<view class="flex hidden">...</view>

<!-- 多属性类 -->
<view class="flex-center">...</view>

<!-- 颜色类（需配合颜色配置） -->
<text class="color-red bg-blue">...</text>
```

### 颜色配置

使用 `ABBR` 字段配合颜色定义：

```javascript
const baseColor = {
  white: '#ffffff',
  black: '#000000',
  red: '#ef4444',
  blue: '#3b82f6'
};

const config = {
  baseClassName: {
    color: { ABBR: 'color' },
    bg: { ABBR: 'background-color' }
  }
};

function getConfig() {
  const handleClass = config.baseClassName;
  Object.values(handleClass).forEach((item) => {
    if (item.ABBR) {
      Object.assign(item, baseColor);
    }
  });
  return config;
}

module.exports = getConfig();
```

生成效果：

```css
.color-white { color: #ffffff; }
.color-black { color: #000000; }
.color-red { color: #ef4444; }
.bg-white { background-color: #ffffff; }
.bg-blue { background-color: #3b82f6; }
```

### 常用静态类

#### 布局类

```javascript
baseClassName: {
  // Display
  'block': 'display: block;',
  'inline': 'display: inline;',
  'inline-block': 'display: inline-block;',
  'flex': 'display: flex;',
  'inline-flex': 'display: inline-flex;',
  'grid': 'display: grid;',
  'hidden': 'display: none;',

  // Flexbox
  'flex-row': 'flex-direction: row;',
  'flex-col': 'flex-direction: column;',
  'flex-wrap': 'flex-wrap: wrap;',
  'items-center': 'align-items: center;',
  'justify-center': 'justify-content: center;',
  'justify-between': 'justify-content: space-between;',

  // Position
  'relative': 'position: relative;',
  'absolute': 'position: absolute;',
  'fixed': 'position: fixed;',
  'sticky': 'position: sticky;'
}
```

## Important 标识 (importantFlags)

配置 `!important` 标识符。

```javascript
importantFlags: {
  prefix: ['!', '$$'],
  suffix: ['-i', '_i', '__imp'],
  custom: ['--important', '##IMP##']
}
```

### 配置项说明

#### prefix

**类型**: `Array<string>`

前缀标识符。

```javascript
prefix: ['!', '$$']

// 使用
// class="!m-10" → margin: 20rpx !important;
// class="$$w-100" → width: 200rpx !important;
```

#### suffix

**类型**: `Array<string>`

后缀标识符。

```javascript
suffix: ['-i', '_i', '__imp']

// 使用
// class="m-10-i" → margin: 20rpx !important;
// class="w-100_i" → width: 200rpx !important;
// class="p-20__imp" → padding: 40rpx !important;
```

#### custom

**类型**: `Array<string>`

自定义标识符。

```javascript
custom: ['--important', '##IMP##']

// 使用
// class="m--important-10" → margin: 20rpx !important;
// class="w##IMP##-100" → width: 200rpx !important;
```

## 变体规则 (variants)

配置响应式和状态变体。

```javascript
variants: {
  responsive: ['sm', 'md', 'lg', 'xl', '2xl'],
  states: ['hover', 'focus', 'active', 'disabled'],
  darkMode: ['dark']
}
```

### 响应式变体 (responsive)

响应式变体允许你根据屏幕尺寸应用不同的样式。使用 Tailwind 风格的语法：`sm:`, `md:`, `lg:`, `xl:`, `2xl:`。

#### 使用示例

```html
<!-- 基础样式 + 响应式样式 -->
<view class="w-full sm:w-100 md:w-200 lg:w-300">
  <!-- 默认宽度 100%，小屏 100rpx，中屏 200rpx，大屏 300rpx -->
</view>

<!-- 响应式静态类 -->
<view class="hidden sm:flex">
  <!-- 默认隐藏，小屏及以上显示为 flex -->
</view>

<!-- 响应式颜色 -->
<text class="color-red sm:color-blue md:color-green">
  <!-- 默认红色，小屏蓝色，中屏绿色 -->
</text>
```

#### 断点配置 (breakpoints)

默认使用 Tailwind 标准断点值，可在配置中自定义：

```javascript
breakpoints: {
  sm: '640px',   // 小屏幕（手机横屏）
  md: '768px',   // 中等屏幕（平板）
  lg: '1024px',  // 大屏幕（笔记本）
  xl: '1280px',  // 超大屏幕（桌面）
  '2xl': '1536px' // 超超大屏幕（大桌面）
}
```

**自定义断点**：

```javascript
breakpoints: {
  sm: '480px',   // 自定义小屏断点
  md: '768px',
  lg: '1024px',
  xl: '1440px',  // 自定义超大屏断点
  '2xl': '1920px'
}
```

**注意**：
- 断点值必须包含单位（如 `px`, `em`, `rem`）
- 如果配置中未指定 `breakpoints`，将使用默认 Tailwind 值
- 响应式变体使用 `min-width` 媒体查询（移动优先）

#### 生成的 CSS 示例

```css
/* 基础样式 */
.w-full { width: 100%; }

/* 响应式样式 */
@media (min-width: 640px) {
  .sm\:w-100 { width: 200rpx; }
}

@media (min-width: 768px) {
  .md\:w-200 { width: 400rpx; }
}

@media (min-width: 1024px) {
  .lg\:w-300 { width: 600rpx; }
}
```

### 状态变体 (states)

状态变体配置（Tailwind 风格伪类前缀）。当 class 以 `hover:` / `focus:` / `active:` 等前缀开头时，会生成对应的伪类选择器。

```javascript
states: ['hover', 'focus', 'active', 'disabled', 'first', 'last', 'odd', 'even']
```

#### 使用示例

```html
<div class="hover:bg-red hover:w-20"></div>
<input class="focus:w-30" />
<button class="active:opacity-50"></button>
<div class="lg:hover:w-20"></div>
```

#### 生成的 CSS 示例

```css
.hover\:w-20:hover { width: 20px; }
@media (min-width: 1024px) { .lg\:hover\:w-20:hover { width: 20px; } }
```

#### 伪类映射规则

- `hover` → `:hover`
- `focus` → `:focus`
- `active` → `:active`
- `disabled` → `:disabled`
- `first` → `:first-child`
- `last` → `:last-child`
- `odd` → `:nth-child(odd)`
- `even` → `:nth-child(even)`

### 暗色模式 (darkMode)

暗色模式变体配置（计划中的功能，当前仅配置名称）。

```javascript
darkMode: ['dark']
```

## 配置示例

### 微信小程序完整配置

```javascript
module.exports = {
  system: {
    cssFormat: 'compressed',
    baseUnit: 'rpx',
    unitConversion: 2,
    compression: true,
    sortClasses: true,
    unitStrategy: {
      autoDetect: true,
      propertyUnits: {
        'font-size': 'rpx',
        'width|height': 'rpx',
        'opacity': '',
        'z-index': ''
      }
    }
  },

  multiFile: {
    entry: {
      path: './pages',
      fileType: ['wxml']
    },
    output: {
      cssOutType: 'uniFile',
      path: './styles',
      fileName: 'common.wxss'
    }
  },

  atomicRules: {
    spacing: {
      m: { properties: ['margin'], defaultUnit: 'rpx' },
      p: { properties: ['padding'], defaultUnit: 'rpx' }
    },
    sizing: {
      w: { properties: ['width'], defaultUnit: 'rpx' },
      h: { properties: ['height'], defaultUnit: 'rpx' }
    }
  },

  baseClassName: {
    'flex': 'display: flex;',
    'flex-center': 'display: flex; justify-content: center; align-items: center;'
  },

  importantFlags: {
    suffix: ['-i']
  }
};
```

### Web 项目配置

```javascript
module.exports = {
  system: {
    cssFormat: 'multiLine',
    baseUnit: 'px',
    unitConversion: 1,
    compression: false,
    sortClasses: true
  },

  multiFile: {
    entry: {
      path: './src',
      fileType: ['html', 'vue']
    },
    output: {
      cssOutType: 'filePath',
      path: './dist/css',
      fileType: 'css'
    }
  },

  atomicRules: {
    spacing: {
      m: { properties: ['margin'], defaultUnit: 'px' },
      p: { properties: ['padding'], defaultUnit: 'px' }
    }
  }
};
```

## 最佳实践

### 1. 模块化配置

将大型配置拆分为多个模块：

```javascript
// configs/spacing.config.js
module.exports = {
  m: { properties: ['margin'], defaultUnit: 'rpx' },
  p: { properties: ['padding'], defaultUnit: 'rpx' }
};

// class2css.config.js
const spacing = require('./configs/spacing.config');

module.exports = {
  atomicRules: {
    spacing: spacing
  }
};
```

### 2. 环境区分

根据环境使用不同配置：

```javascript
const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  system: {
    cssFormat: isDev ? 'multiLine' : 'compressed',
    compression: !isDev
  }
};
```

### 3. 性能优化

```javascript
system: {
  compression: true,        // 启用压缩
  sortClasses: true,        // 启用排序
  unitStrategy: {
    autoDetect: true        // 启用智能单位检测
  }
}
```

### 4. 命名规范

保持类名简洁且语义化：

```javascript
atomicRules: {
  spacing: {
    m: { /* margin */ },
    mt: { /* margin-top */ },
    mx: { /* margin-left + margin-right */ }
  }
}
```

### 5. 单位策略

合理配置单位策略：

```javascript
unitStrategy: {
  autoDetect: true,
  propertyUnits: {
    'font-size': 'rpx',      // 字体使用 rpx
    'opacity': '',           // 透明度无单位
    'z-index': '',           // 层级无单位
    'line-height': ''        // 行高可以无单位
  }
}
```

## 配置验证

使用内置验证工具检查配置：

```javascript
const { ConfigValidator } = require('class2css');

const validator = new ConfigValidator(eventBus);
const result = validator.validateConfig(config);

if (!result.isValid) {
  console.log('配置错误:', result.errors);
  console.log('警告:', result.warnings);
}
```

## 配置诊断

运行配置诊断获取优化建议：

```javascript
const { ConfigDiagnostics } = require('class2css');

const diagnostics = new ConfigDiagnostics(eventBus, configManager);
const results = await diagnostics.runFullDiagnostics();

console.log(diagnostics.generateReport());
```

## 常见问题

### Q: 如何禁用单位转换？

```javascript
system: {
  unitConversion: 1  // 设置为 1 表示不转换
}
```

### Q: 如何支持多种单位？

```javascript
system: {
  unitStrategy: {
    autoDetect: true  // 启用自动检测，用户可以自由使用任何单位
  }
}
```

### Q: 如何配置无单位属性？

```javascript
system: {
  unitStrategy: {
    propertyUnits: {
      'opacity': '',
      'z-index': '',
      'line-height': ''
    }
  }
}
```

### Q: 如何使用统一文件模式？

```javascript
multiFile: {
  output: {
    cssOutType: 'uniFile',
    fileName: 'common.wxss'
  }
}
```

---

> 💡 更多配置示例请参考项目中的 `class2css.config.js` 文件。

