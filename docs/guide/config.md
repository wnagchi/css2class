# 配置指南

Class2CSS 通过 `class2css.config.js` 文件进行配置。配置文件支持新旧两种格式，完全向后兼容。

:::tip 阅读方式
如果你想“避免重复配置”，直接复制： [配置模板（可复制）](./config-template.md)。  
如果你刚开始用，建议先看 [快速开始](./getting-started.md) 跑通一次；再回到本页把配置补全（单位策略/排序/多文件/增量）。
:::

## 配置文件位置

默认配置文件路径：`./class2css.config.js`

可以通过 CLI 参数 `-c, --config` 指定自定义路径。

## 最小配置（可运行）

```js
module.exports = {
  system: { baseUnit: 'rpx', unitConversion: 2, cssFormat: 'compressed' },
  output: { path: '../dist', fileName: 'styles.wxss' },
  cssName: {
    m: { classArr: ['margin'], unit: 'rpx' },
    w: { classArr: ['width'], unit: 'rpx' },
    h: { classArr: ['height'], unit: 'rpx' },
  },
};
```

## 配置结构

### 新版配置结构（推荐）

新版本引入了 `system` 配置节，提供更强大的功能：

```javascript
module.exports = {
  // ========== 系统基础配置 ==========
  system: {
    // CSS 输出格式: 'multiLine' | 'singleLine' | 'compressed'
    cssFormat: "compressed",
    // 基础单位设置
    baseUnit: "rpx",
    // 单位转换比例 生成样式单位=设置单位*比例
    unitConversion: 2,
    // 是否压缩CSS
    compression: true,
    // 是否对生成的CSS类进行字母排序（按选择器名称）
    sortClasses: true,
    // 智能单位处理策略
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
  },

  // ========== 输出配置 ==========
  output: {
    path: "../dist",
    fileName: "styles.wxss"
  },

  // ========== CSS类映射 ==========
  cssName: {
    "m": { classArr: ["margin"], unit: "rpx" },
    "w": { classArr: ["width"], unit: "rpx" },
    "h": { classArr: ["height"], unit: "rpx" }
  },

  // ========== 静态类配置 ==========
  baseClassName: {
    "container": "max-width: 1200rpx; margin: 0 auto;",
    "flex": "display: flex;"
  }
};
```

### 向后兼容

工具完全兼容旧版配置格式：

```javascript
// 旧版配置仍然有效
module.exports = {
  baseUnit: "rpx",           // 自动映射到 system.baseUnit
  unitConversion: 2,         // 自动映射到 system.unitConversion
  output: { /* ... */ },
  cssName: { /* ... */ },
  baseClassName: { /* ... */ }
};
```

## 配置项说明

### system 配置

#### cssFormat

CSS 输出格式，可选值：
- `'multiLine'`：多行格式（每个规则占一行）
- `'singleLine'`：单行格式
- `'compressed'`：压缩格式（默认）

#### baseUnit

基础单位设置，默认 `'rpx'`。

#### unitConversion

单位转换比例，默认 `2`。  
生成样式单位 = 设置单位 × 比例

例如：`unitConversion: 2` 时，`m-10` 会生成 `margin: 20rpx;`

#### compression

是否压缩CSS，默认 `true`。

#### sortClasses

是否对生成的CSS类进行字母排序（按选择器名称），默认 `false`。

#### unitStrategy

智能单位处理策略：

```javascript
unitStrategy: {
  // 自动检测：如果用户写了单位，保持原单位；如果没写，使用默认单位
  autoDetect: true,
  // 属性默认单位映射
  propertyUnits: {
    'font-size': 'rpx',
    'width|height': 'rpx',
    'opacity': '',
    'z-index': '',
    'line-height': '',
    'border-radius': 'rpx'
  }
}
```

也可以先阅读概念页：[单位与转换策略](./units.md)。

### output 配置

#### path

输出文件目录路径。

#### fileName

输出文件名（包含扩展名）。

#### commonCssPath（可选）

公共基础样式文件路径（如果你希望每次输出都带上一段统一的基础 CSS）。

### cssName 配置

CSS类映射，定义类名到CSS属性的映射关系：

```javascript
cssName: {
  "m": { classArr: ["margin"], unit: "rpx" },
  "mt": { classArr: ["margin-top"], unit: "rpx" },
  "w": { classArr: ["width"], unit: "rpx" },
  "h": { classArr: ["height"], unit: "rpx" }
}
```

### baseClassName 配置

静态类配置，定义预定义的CSS类：

```javascript
baseClassName: {
  "container": "max-width: 1200rpx; margin: 0 auto;",
  "flex": "display: flex;",
  "flex-center": "display: flex; justify-content: center; align-items: center;"
}
```

也可以阅读概念页：[Important 与静态类](./important-and-static.md)。

### multiFile 配置（多文件模式）

用于多文件构建和增量模式：

```javascript
multiFile: {
  entry: {
    path: "./src",
    fileType: ["wxml", "html"],
  },
  output: {
    cssOutType: "uniFile",
    path: "./dist",
    fileName: "styles.wxss",
    
    // 增量模式配置
    incrementalOnlyAdd: true,
    incrementalBaseline: "fromOutputFile",
    rebuildOnStart: true,
    unusedReportLimit: 200,
    
    // 统一文件写入策略
    uniFileWriteMode: "appendDelta",
  },
}
```

详细说明请参考 [增量模式](./incremental.md)。

### importantFlags 配置

Important标识配置：

```javascript
importantFlags: {
  suffix: ['-i', '_i'], // 后缀标识: w-100_i, w-100-i
}
```

## 配置模块化

将大型配置拆分为多个模块：

```javascript
// configs/spacing.config.js
module.exports = {
  margin: {
    "m": { classArr: ["margin"], unit: "rpx" },
    "mt": { classArr: ["margin-top"], unit: "rpx" }
  }
};

// class2css.config.js
const spacing = require('./configs/spacing.config');

module.exports = {
  system: { /* ... */ },
  cssName: {
    ...spacing.margin,
    // 其他配置
  }
};
```

## 配置验证

使用内置诊断工具检查配置健康状况：

```javascript
const ConfigDiagnostics = require('class2css/src/utils/ConfigDiagnostics');

const diagnostics = new ConfigDiagnostics(eventBus, configManager);
const results = await diagnostics.runFullDiagnostics();
console.log(diagnostics.generateReport());
```

## 下一步

- 想直接拿一份“全功能可复制配置”：阅读 [配置模板（可复制）](./config-template.md)
- 想查当前已内置的类名规则：阅读 [规则参考](./rules-reference.md)
- 想先理解类名解析：阅读 [类名语法与生成规则](./concepts.md)
- 想把单位处理写稳：阅读 [单位与转换策略](./units.md)

