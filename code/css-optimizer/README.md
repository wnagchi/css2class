# CSS Optimizer

🚀 高性能CSS生成工具，支持多格式代码解析和自定义规则，类似于Tailwind CSS但更加灵活和定制化。

## ✨ 特性

- 🎯 **多格式支持**: 支持 `.vue`、`.wxml`、`.html`、`.jsx`、`.tsx` 等多种文件格式
- 🎨 **自定义颜色**: 支持颜色映射和直接颜色值解析
- 📏 **灵活单位**: 支持自定义单位转换（如 px、rpx、rem 等）
- 📱 **小程序兼容**: 特别优化微信小程序 WXML 代码解析
- ⚡ **高性能**: 多级缓存、增量更新、并行处理
- 👀 **实时监听**: 文件变化时自动重新生成CSS
- 🛠️ **高度可配置**: 通过YAML配置文件灵活定制规则
- 📊 **性能监控**: 详细的性能统计和缓存分析

## 📦 安装

```bash
npm install -g css-optimizer
```

或使用本地安装：

```bash
npm install css-optimizer
```

## 🚀 快速开始

### 1. 初始化项目

```bash
css-optimizer init my-project
cd my-project
npm install
```

### 2. 配置规则

编辑 `config/config.yaml` 文件，自定义你的CSS规则：

```yaml
# 目标文件格式
targetFormats:
  - '.vue'
  - '.wxml'
  - '.html'

# 颜色配置
colors:
  customColors:
    primary: '#1890ff'
    success: '#52c41a'
    headerblue: '#007bff'
  directColorParsing: true

# 单位配置
units:
  spacing:
    defaultUnit: 'px'
    conversions:
      px: 1
      rpx: 2
      rem: 16
```

### 3. 构建CSS

```bash
# 构建单个文件
css-optimizer build src/component.vue -o dist/styles.css

# 构建整个目录
css-optimizer build src/ -o dist/styles.css

# 压缩输出
css-optimizer build src/ -o dist/styles.min.css --minify
```

### 4. 监听模式

```bash
# 启动监听模式，自动检测文件变化
css-optimizer watch src/ -o dist/styles.css
```

## 📋 命令说明

### 全局选项

- `-c, --config <path>`: 指定配置文件路径
- `-o, --output <path>`: 指定输出文件路径
- `--watch`: 启用监听模式
- `--minify`: 压缩CSS输出
- `--stats`: 显示性能统计
- `--clear-cache`: 清理缓存
- `--validate`: 验证配置
- `--init`: 初始化示例项目

### 子命令

#### `init <projectName>`
初始化示例项目

```bash
css-optimizer init my-awesome-project
```

#### `build <source>`
构建CSS文件

```bash
css-optimizer build src/ -o dist/styles.css --minify
```

#### `watch <source>`
启动监听模式

```bash
css-optimizer watch src/ -o dist/styles.css
```

#### `stats`
显示性能统计

```bash
css-optimizer stats
```

#### `cache`
缓存管理

```bash
css-optimizer cache --clear    # 清理缓存
css-optimizer cache --info     # 显示缓存信息
```

## 🎨 使用示例

### Vue文件示例

```vue
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold text-primary mb-4">
      Vue组件示例
    </h1>
    <div class="bg-light p-6 rounded-lg shadow-md">
      <p class="text-gray-600 mb-2">自定义颜色示例</p>
      <button class="bg-headerblue text-white px-4 py-2 rounded hover:bg-blue-600">
        按钮
      </button>
    </div>
  </div>
</template>
```

### WXML文件示例（微信小程序）

```xml
<view class="container mx-auto p-4">
  <view class="bg-headerblue p-6 rounded-lg">
    <text class="text-white text-xl font-bold">
      小程序示例
    </text>
    <view class="mt-4 flex justify-center">
      <button class="bg-success text-white px-4 py-2 rounded">
        小程序按钮
      </button>
    </view>
  </view>
</view>
```

### HTML文件示例

```html
<div class="container mx-auto p-8">
  <h1 class="text-3xl font-bold text-primary text-center mb-8">
    CSS Optimizer 示例
  </h1>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <p class="text-gray-700 mb-4">
      支持响应式设计
    </p>
    <button class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 md:text-xl">
      响应式按钮
    </button>
  </div>
</div>
```

## ⚙️ 配置详解

### 颜色配置

```yaml
colors:
  # 自定义颜色映射
  customColors:
    primary: '#1890ff'
    success: '#52c41a'
    warning: '#faad14'
    error: '#ff4d4f'
    headerblue: '#007bff'
  
  # 直接颜色值解析（支持十六进制、rgb等）
  directColorParsing: true
```

### 单位配置

```yaml
units:
  spacing:
    defaultUnit: 'px'
    conversions:
      px: 1
      rpx: 2      # 小程序rpx单位
      rem: 16
      em: 16
```

### 响应式配置

```yaml
breakpoints:
  sm: '640px'
  md: '768px'
  lg: '1024px'
  xl: '1280px'
  '2xl': '1536px'
```

### 规则配置

```yaml
rules:
  spacing:
    margin: ['m', 'mt', 'mr', 'mb', 'ml', 'mx', 'my']
    padding: ['p', 'pt', 'pr', 'pb', 'pl', 'px', 'py']
  
  colors:
    background: ['bg']
    text: ['text']
    border: ['border']
  
  interactions:
    hover: ['hover:']
    focus: ['focus:']
```

## 🔧 编程接口

### JavaScript/TypeScript 使用

```typescript
import { CSSOptimizer } from 'css-optimizer';

const optimizer = new CSSOptimizer('./config.yaml');

// 初始化
await optimizer.initialize();

// 处理单个文件
const css = await optimizer.processFile('./src/component.vue');

// 处理目录
const result = await optimizer.processDirectory('./src/', './dist/styles.css');

// 监听模式
await optimizer.startWatch('./src/', './dist/styles.css');
```

### API 参考

#### CSSOptimizer

- `initialize()`: 初始化优化器
- `processFile(filePath)`: 处理单个文件
- `processDirectory(dirPath, outputPath?)`: 处理目录
- `startWatch(dirPath, outputPath?)`: 启动监听模式
- `stopWatch()`: 停止监听
- `getPerformanceStats()`: 获取性能统计
- `clearCache()`: 清理缓存

## 📊 性能特性

### 缓存系统
- **多级缓存**: L1内存缓存 + L2扩展缓存
- **智能清理**: 自动清理过期缓存项
- **命中率统计**: 详细的缓存性能分析

### 增量更新
- **文件监听**: 实时监听文件变化
- **防抖处理**: 避免频繁重复处理
- **精确更新**: 只处理变更的文件

### 并行处理
- **多线程支持**: 利用多核CPU性能
- **内存优化**: 智能内存管理和限制
- **性能监控**: 实时性能指标统计

## 🛠️ 开发

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建
```bash
npm run build
```

### 测试
```bash
npm test
```

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题或建议，请提交 Issue 或联系开发团队。

---

**CSS Optimizer** - 让CSS开发更高效、更灵活！ 🚀