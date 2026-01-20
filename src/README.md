# Class2CSS 模块化架构

这是 Class2CSS 工具的模块化重构版本，将原有的单文件架构拆分为多个独立模块，提高了代码的可维护性、可测试性和可扩展性。

## 架构概览

```
src/
├── core/                    # 核心模块
│   ├── EventBus.js         # 事件总线
│   ├── StateManager.js     # 状态管理器
│   ├── ConfigManager.js    # 配置管理器
│   ├── CacheManager.js     # 缓存管理器
│   └── FullScanManager.js  # 全量扫描管理器 (新增)
├── parsers/                # 解析器模块
│   ├── RegexCompiler.js    # 正则编译器
│   ├── ImportantParser.js  # Important标识解析器
│   └── ClassParser.js      # 类名解析器
├── generators/             # 生成器模块
│   ├── DynamicClassGenerator.js  # 动态类生成器
│   ├── StaticClassGenerator.js   # 静态类生成器 (计划中)
│   └── CSSGenerator.js     # CSS生成器 (计划中)
├── watchers/               # 监听器模块
│   ├── FileWatcher.js      # 文件监听器
│   └── ConfigWatcher.js    # 配置监听器
├── writers/                # 输出模块
│   ├── FileWriter.js       # 文件写入器
│   ├── UnifiedWriter.js    # 统一文件写入器 (新增)
│   └── OutputManager.js    # 输出管理器 (计划中)
├── utils/                  # 工具模块
│   ├── Logger.js           # 日志工具
│   ├── Throttle.js         # 节流工具
│   └── FileUtils.js        # 文件工具
├── index.js                # 主入口文件
├── example.js              # 使用示例
└── README.md               # 本文档
```

## 核心设计原则

### 1. 单一职责原则
每个模块只负责一个特定功能：
- `EventBus`: 模块间通信
- `StateManager`: 状态管理
- `ConfigManager`: 配置管理
- `CacheManager`: 缓存管理

### 2. 依赖注入
所有模块通过构造函数接收依赖，便于测试和扩展：
```javascript
const classParser = new ClassParser(eventBus, regexCompiler, importantParser, userStaticClassSet);
```

### 3. 事件驱动架构
使用 EventBus 进行松耦合通信：
```javascript
eventBus.on('parser:completed', (stats) => {
  console.log(`Parsed ${stats.totalCount} classes`);
});
```

### 4. 状态集中管理
通过 StateManager 统一管理全局状态：
```javascript
stateManager.updateClassListSet(classList);
stateManager.getStats();
```

## 模块详解

### 核心模块 (core/)

#### EventBus.js
事件总线，提供模块间通信机制：
- 支持普通事件和一次性事件
- 错误处理和事件统计
- 事件清理和调试功能

#### StateManager.js
状态管理器，统一管理全局状态：
- 核心状态集合管理
- 扫描状态控制
- 状态更新和统计

#### ConfigManager.js
配置管理器，处理配置文件加载和热重载：
- 配置文件加载和验证
- 配置热重载机制
- 配置引用更新

#### CacheManager.js
缓存管理器，处理文件缓存和全量扫描缓存：
- 文件内容缓存（LRU策略）
- 全量扫描数据缓存
- 缓存优化和清理

#### FullScanManager.js
全量扫描管理器，专门处理文件的全量扫描和数据管理：
- 扫描指定目录下的所有匹配文件
- 维护所有文件的样式数据集合
- 提供数据锁定机制确保数据一致性
- 支持增量数据更新和文件删除
- 为统一文件模式提供完整的数据源

### 解析器模块 (parsers/)

#### RegexCompiler.js
正则表达式编译器：
- 预编译正则表达式
- Important标识正则生成
- 正则表达式缓存和验证

#### ImportantParser.js
Important标识解析器：
- Important标识检测和清理
- CSS Important添加
- 批量处理和验证

#### ClassParser.js
类名解析器：
- HTML/WXML类名提取
- 动态/静态类名分类
- 批量解析和验证

### 生成器模块 (generators/)

#### DynamicClassGenerator.js
动态类生成器：
- 基于配置生成动态CSS
- 单位转换处理和小数点处理优化
- 用户基础类处理
- 零值优化（如 `m-0` 生成 `margin: 0` 而不是 `margin: 0rpx`）
- Important标识支持

### 监听器模块 (watchers/)

#### FileWatcher.js
文件监听器：
- 基于 chokidar 的文件系统监听
- 支持多种文件类型监听
- 轮询模式支持（usePolling）
- 文件变化事件处理和防抖

#### ConfigWatcher.js
配置文件监听器：
- 监听 `class2css.config.js` 文件变化
- 自动热重载配置（300ms防抖）
- 配置验证和变更检测
- 智能重新初始化（根据变更类型）
- Node.js模块缓存清理
- 详细的统计信息和错误处理

### 输出模块 (writers/)

#### FileWriter.js
文件写入器：
- 支持单文件模式（filePath）和统一文件模式（uniFile）
- 智能路径解析和目录创建
- 输出配置管理
- 批量写入支持

#### UnifiedWriter.js
统一文件写入器（专为uniFile模式设计）：
- 防抖写入机制（300ms延迟）
- 合并所有文件的样式数据
- 静态类CSS生成
- 完整CSS内容组装
- 与FullScanManager协同工作

### 工具模块 (utils/)

#### Logger.js
日志工具：
- 统一日志格式
- 日志级别控制
- 性能日志和统计

#### SmartThrottle.js
智能节流器：
- 优先级任务调度
- 批量处理和队列管理
- 任务取消和清理

#### FileUtils.js
文件工具：
- 文件操作封装
- 路径处理工具
- 批量文件操作

## 输出模式

Class2CSS 支持两种输出模式，通过配置文件中的 `cssOutType` 字段控制：

### 1. 单文件模式 (filePath)
```javascript
multiFile: {
  output: {
    cssOutType: "filePath",  // 单文件模式
    path: "./output/lib",
    fileType: "wxss"
  }
}
```
- 每个源文件生成对应的CSS文件
- 文件结构与源文件保持一致
- 适合组件化开发
- 文件变化只影响对应的CSS文件

### 2. 统一文件模式 (uniFile)
```javascript
multiFile: {
  output: {
    cssOutType: "uniFile",   // 统一文件模式
    path: "./output/lib",
    fileName: "common.wxss"
  }
}
```
- 所有样式合并到一个文件中
- 任何文件变化都会重新生成完整的CSS
- 使用防抖机制优化性能（300ms延迟）
- 适合需要统一样式管理的场景

### 输出模式特性对比

| 特性 | 单文件模式 | 统一文件模式 |
|------|------------|--------------|
| 文件数量 | 多个CSS文件 | 单个CSS文件 |
| 更新范围 | 仅更新变化的文件 | 重新生成完整CSS |
| 性能 | 增量更新，快速 | 防抖优化，适中 |
| 适用场景 | 组件化开发 | 统一样式管理 |
| 内存占用 | 较低 | 较高（维护全量数据） |

## 使用方法

### 基本用法

```javascript
const Class2CSS = require('./src/index');

// 创建实例
const class2css = new Class2CSS({
  configPath: './class2css.config.js',
  cacheSize: 1000,
  logger: {
    level: 'info',
    enableDebug: true
  }
});

// 启动
await class2css.start();

// 处理文件变更
await class2css.handleFileChange('./example.html');

// 获取状态
const status = class2css.getStatus();
console.log(status);

// 停止
class2css.stop();
```

### 高级用法

```javascript
// 获取各个模块进行直接操作
const modules = class2css.getModules();
const { logger, importantParser, classParser } = modules;

// 直接使用解析器
const htmlContent = '<div class="w-100 h-50">Hello</div>';
const parseResult = classParser.parseClassOptimized(htmlContent);

// 直接使用Important解析器
const importantResults = importantParser.batchProcessImportant(['w-100', '!w-100']);

// 设置日志级别
logger.setLevel('debug');
logger.setDebugMode(true);
```

### 事件监听

```javascript
const eventBus = class2css.getEventBus();

// 监听重要事件
eventBus.on('class2css:started', () => {
  console.log('Class2CSS started');
});

eventBus.on('parser:completed', (stats) => {
  console.log(`Parsed ${stats.totalCount} classes`);
});

eventBus.on('generator:dynamic:completed', (stats) => {
  console.log(`Generated ${stats.generatedCount} dynamic classes`);
});

eventBus.on('cache:file:updated', (filePath) => {
  console.log(`File cache updated: ${filePath}`);
});
```

## 配置选项

### 实例配置选项
```javascript
const options = {
  configPath: './class2css.config.js',  // 配置文件路径
  cacheSize: 1000,                      // 缓存大小
  logger: {
    level: 'info',                      // 日志级别: debug, info, warn, error
    enableDebug: false,                 // 是否启用调试模式
    enableTimestamp: true               // 是否显示时间戳
  }
};
```

### 配置文件优化 (class2css.config.js)

新版本支持动态配置生成，通过函数式配置提高可维护性：

```javascript
const config = {
  // 基础配置...
  baseClassName: {
    color: { ABBR: "color" },
    bg: { ABBR: "background-color" },
    bcolor: { ABBR: "border-color" }
  }
};

// 基础色彩配置
const baseColor = {
  white: "#ffffff",
  black: "#000000",
  red: "#ef4444",
  blue: "#3b82f6",
  // ... 更多颜色
};

// 动态配置生成函数
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
```

### 配置特性：
- 支持颜色配置的动态合并
- 减少配置文件冗余
- 便于维护和扩展
- 支持热重载

### 直接颜色值写法

除了使用预设的颜色映射（如 `bg-red`、`color-white`），现在支持直接在 class 中写入颜色值。该功能适用于所有带 `ABBR` 的颜色族（`bg`、`color`、`bcolor` 等）。

#### Hex 颜色格式
```html
<!-- 3位 hex -->
<div class="bg-hex-fff">白色背景</div>
<div class="color-hex-000">黑色文字</div>

<!-- 4位 hex（含 alpha） -->
<div class="bg-hex-ffff">不透明白色背景</div>

<!-- 6位 hex -->
<div class="bg-hex-112233">深色背景</div>
<div class="color-hex-ff0000">红色文字</div>

<!-- 8位 hex（含 alpha） -->
<div class="bg-hex-ffffffff">完全不透明白色背景</div>
```

#### RGB 颜色格式
```html
<div class="bg-rgb-255-0-0">红色背景</div>
<div class="color-rgb-0-128-255">蓝色文字</div>
```

#### RGBA 颜色格式
```html
<!-- alpha 值支持多种写法：
     - 两位数字 < 10：除以 10（如 05 → 0.5, 08 → 0.8）
     - 两位数字 >= 10：除以 100 作为百分比（如 50 → 0.5, 99 → 0.99）
     - 下划线分隔：直接替换为点（如 0_5 → 0.5）
     - 其他格式：直接解析（如 1 → 1.0, 0.5 → 0.5）
-->
<div class="bg-rgba-0-0-0-05">半透明黑色背景（05 → 0.5）</div>
<div class="bg-rgba-255-0-0-0_5">半透明红色背景（0_5 → 0.5）</div>
<div class="bg-rgba-0-0-0-50">50% 不透明度黑色背景（50 → 0.5）</div>
<div class="color-rgba-0-0-0-08">80% 不透明度黑色文字（08 → 0.8）</div>
<div class="bg-rgba-255-0-0-99">99% 不透明度红色背景（99 → 0.99）</div>
```

#### 与响应式和 Important 组合使用
```html
<!-- 响应式变体 -->
<div class="sm:bg-hex-fff md:bg-rgb-255-0-0">响应式背景色</div>

<!-- Important 标识 -->
<div class="bg-hex-fff_i">强制白色背景</div>
<div class="!color-rgb-0-0-0">强制黑色文字</div>

<!-- 组合使用 -->
<div class="sm:bg-rgba-255-0-0-05_i">响应式 + Important</div>
```

#### 优先级说明
- **映射优先**：如果配置中存在对应的颜色映射（如 `bg-red`），优先使用映射值
- **直接值后备**：只有当映射不存在时，才会尝试解析为直接颜色值
- **解析失败**：如果既不是映射值，也无法解析为有效颜色值，则不会生成 CSS 规则

#### 兼容性
- ✅ 完全兼容 Web（HTML/CSS）
- ✅ 完全兼容小程序（WXML/WXSS）
- ✅ 只使用字母、数字、下划线、短横线，无需转义
- ✅ 与现有颜色映射方案完全兼容，不会产生冲突

## CLI 工具

项目提供了多种启动方式：

### 1. 快速启动 (run.js)
```bash
node run.js
```
直接启动工具，使用默认配置

### 2. NPM 脚本
```bash
npm start          # 启动监听模式
npm run start:no-watch  # 启动但不监听文件变化
npm run dev        # 开发模式
npm test           # 运行测试
npm run help       # 显示帮助
npm run version    # 显示版本
```

### 3. 命令行工具 (bin/class2css.js)
```bash
# 全局安装后使用
class2css --help
class2css --version
class2css --config ./custom.config.js
class2css --no-watch  # 不监听文件变化

# 本地使用
./bin/class2css.js --help
```

### CLI 参数说明：
- `--config, -c`: 指定配置文件路径
- `--no-watch`: 禁用文件监听
- `--help, -h`: 显示帮助信息
- `--version, -v`: 显示版本信息

## 最新功能

### 🆕 零值优化
```css
/* 之前 */
.m-0 { margin: 0.rpx; }

/* 现在 */
.m-0 { margin: 0; }
```

### 🆕 统一文件模式
- 支持将所有样式合并到单个文件
- 防抖写入优化性能
- 全量数据管理确保完整性

### 🆕 配置文件优化
- 函数式配置生成
- 动态颜色配置合并
- 减少配置冗余

### 🆕 配置文件热重载
- 自动监听配置文件变化
- 智能配置验证和应用
- 防抖机制优化性能
- 支持增量更新和完全重载

### 🆕 完整的模块化架构
- 16个独立模块
- 事件驱动设计
- 依赖注入支持

### 🆕 直接颜色值写法
支持在 class 中直接写入颜色值，无需预先配置颜色映射：

```html
<!-- Hex 颜色 -->
<div class="bg-hex-fff">白色背景</div>
<div class="color-hex-ff0000">红色文字</div>

<!-- RGB 颜色 -->
<div class="bg-rgb-255-0-0">红色背景</div>

<!-- RGBA 颜色 -->
<div class="bg-rgba-0-0-0-05">半透明黑色背景</div>
<div class="color-rgba-255-0-0-0_5">半透明红色文字</div>

<!-- 与响应式和 Important 组合 -->
<div class="sm:bg-hex-fff">响应式背景</div>
<div class="bg-hex-fff_i">强制白色背景</div>
```

**特性：**
- ✅ 支持 hex（3/4/6/8位）、rgb、rgba 格式
- ✅ 映射优先：现有颜色映射（如 `bg-red`）优先使用
- ✅ 完全兼容 Web 和小程序
- ✅ 与现有颜色映射方案无冲突

## 优势

### 1. 可维护性
- 模块化设计，职责清晰
- 代码结构清晰，易于理解
- 便于定位和修复问题

### 2. 可测试性
- 每个模块可独立测试
- 依赖注入便于模拟
- 事件驱动便于测试

### 3. 可扩展性
- 易于添加新功能
- 插件化架构
- 配置驱动

### 4. 性能优化
- 智能缓存机制
- 优先级任务调度
- 内存管理优化

## 迁移指南

### 从原版本迁移到模块化版本

#### 1. 基本迁移
```javascript
// 旧版本
const originalClass2CSS = require('./class2css.js');

// 新版本
const Class2CSS = require('./src/index');
const class2css = new Class2CSS({ configPath: './class2css.config.js' });
await class2css.start();
```

#### 2. 配置文件升级
配置文件基本格式保持兼容，但建议使用新的函数式配置：
```javascript
// 旧配置：静态配置
module.exports = {
  baseClassName: {
    color: { ABBR: "color", white: "#fff", black: "#000" }
  }
};

// 新配置：动态配置
const config = { /* 基础配置 */ };
const baseColor = { /* 颜色配置 */ };
function getConfig() { /* 动态合并逻辑 */ }
module.exports = getConfig();
```

#### 3. 输出模式选择
- 保持现有行为：使用 `cssOutType: "filePath"`
- 统一样式管理：使用 `cssOutType: "uniFile"`

#### 4. CLI工具升级
```bash
# 旧版本
node class2css.js

# 新版本
node run.js                    # 快速启动
npm start                      # NPM脚本
./bin/class2css.js --help      # CLI工具
```

### 兼容性说明
- ✅ 配置文件格式完全兼容
- ✅ 生成的CSS格式兼容（除零值优化外）
- ✅ API接口向前兼容
- ⚠️ 零值处理有所改进（`m-0` 现在生成 `margin: 0` 而不是 `margin: 0.rpx`）

## 开发指南

### 添加新模块

1. 在相应目录下创建新模块文件
2. 实现模块接口
3. 在 `index.js` 中集成新模块
4. 添加相应的事件处理

### 测试模块

```javascript
const EventBus = require('./core/EventBus');
const YourModule = require('./your/YourModule');

const eventBus = new EventBus();
const yourModule = new YourModule(eventBus, dependencies);

// 测试模块功能
// 监听相关事件
```

## 版本历史

### v2.1.0 (2025-01-20)
- ✨ **新功能**：直接颜色值写法
  - 支持 hex、rgb、rgba 格式的直接颜色值
  - 无需预先配置颜色映射即可使用
  - 完全兼容现有颜色映射方案（映射优先）
  - 支持与响应式变体和 Important 标识组合使用

### v2.0.0 (2025-01-30)
- 🚀 **重大更新**：完全模块化架构重构
- ✨ **新功能**：统一文件模式 (uniFile)
- ✨ **新功能**：零值优化处理
- ✨ **新功能**：CLI工具支持
- ✨ **新功能**：函数式配置生成
- 🛠️ **改进**：完整的事件驱动架构
- 🛠️ **改进**：智能缓存和性能优化
- 🛠️ **改进**：全量扫描管理器
- 🛠️ **改进**：防抖写入机制
- 📦 **架构**：15个独立模块
- 📦 **架构**：依赖注入设计
- 📦 **架构**：状态集中管理

### v1.x
- 单文件架构
- 基础CSS生成功能
- 文件监听和热重载

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

### 开发规范
- 遵循 ESLint 规则
- 编写单元测试
- 更新相关文档
- 保持向后兼容性

## 许可证

MIT License 