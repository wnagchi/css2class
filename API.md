# Class2CSS API 文档

本文档详细说明 Class2CSS 的所有 API 接口。

## 📋 目录

- [主类 API](#主类-api)
- [核心模块 API](#核心模块-api)
- [工具模块 API](#工具模块-api)
- [事件系统](#事件系统)
- [使用示例](#使用示例)

## 主类 API

### Class2CSS

主入口类，提供完整的功能接口。

#### 构造函数

```javascript
new Class2CSS(options)
```

**参数**:

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| options.configPath | string | 否 | `'./class2css.config.js'` | 配置文件路径 |
| options.cacheSize | number | 否 | `1000` | 缓存大小 |
| options.logger | object | 否 | - | 日志配置 |
| options.logger.level | string | 否 | `'info'` | 日志级别 |
| options.logger.enableDebug | boolean | 否 | `false` | 是否启用调试模式 |
| options.logger.enableTimestamp | boolean | 否 | `true` | 是否显示时间戳 |

**示例**:

```javascript
const Class2CSS = require('class2css');

const tool = new Class2CSS({
  configPath: './class2css.config.js',
  cacheSize: 1000,
  logger: {
    level: 'info',
    enableDebug: true,
    enableTimestamp: true
  }
});
```

#### start()

启动 Class2CSS 工具。

```javascript
async start(): Promise<void>
```

**返回值**: `Promise<void>`

**示例**:

```javascript
await tool.start();
console.log('Class2CSS started');
```

**触发事件**:
- `class2css:started` - 启动成功

#### stop()

停止 Class2CSS 工具。

```javascript
async stop(): Promise<void>
```

**返回值**: `Promise<void>`

**示例**:

```javascript
await tool.stop();
console.log('Class2CSS stopped');
```

**触发事件**:
- `class2css:stopped` - 停止成功

#### handleFileChange()

处理文件变更。

```javascript
async handleFileChange(filePath: string): Promise<void>
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| filePath | string | 是 | 变更的文件路径 |

**返回值**: `Promise<void>`

**示例**:

```javascript
await tool.handleFileChange('./pages/index.wxml');
```

**触发事件**:
- `file:changed` - 文件变更开始处理
- `parser:completed` - 解析完成
- `generator:dynamic:completed` - 生成完成

#### performFullScan()

执行全量扫描。

```javascript
async performFullScan(): Promise<void>
```

**返回值**: `Promise<void>`

**示例**:

```javascript
await tool.performFullScan();
console.log('Full scan completed');
```

#### getStatus()

获取当前状态。

```javascript
getStatus(): object
```

**返回值**: 

```typescript
{
  isRunning: boolean;
  stats: {
    totalClasses: number;
    dynamicClasses: number;
    staticClasses: number;
  };
  config: object;
}
```

**示例**:

```javascript
const status = tool.getStatus();
console.log('Total classes:', status.stats.totalClasses);
```

#### getEventBus()

获取事件总线实例。

```javascript
getEventBus(): EventBus
```

**返回值**: `EventBus` 实例

**示例**:

```javascript
const eventBus = tool.getEventBus();
eventBus.on('parser:completed', (stats) => {
  console.log('Parsed:', stats.totalCount);
});
```

#### getModules()

获取所有内部模块。

```javascript
getModules(): object
```

**返回值**:

```typescript
{
  eventBus: EventBus;
  logger: Logger;
  configManager: ConfigManager;
  stateManager: StateManager;
  cacheManager: CacheManager;
  regexCompiler: RegexCompiler;
  importantParser: ImportantParser;
  classParser: ClassParser;
  dynamicClassGenerator: DynamicClassGenerator;
  fileWriter: FileWriter;
  fileWatcher: FileWatcher;
  configWatcher: ConfigWatcher;
}
```

**示例**:

```javascript
const modules = tool.getModules();
const { logger, configManager } = modules;

logger.info('Current config:', configManager.getConfig());
```

## 核心模块 API

### EventBus

事件总线，提供模块间通信机制。

#### on()

注册事件监听器。

```javascript
on(eventName: string, handler: Function): void
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| eventName | string | 是 | 事件名称 |
| handler | Function | 是 | 事件处理函数 |

**示例**:

```javascript
eventBus.on('parser:completed', (stats) => {
  console.log('Parsing completed:', stats);
});
```

#### once()

注册一次性事件监听器。

```javascript
once(eventName: string, handler: Function): void
```

**示例**:

```javascript
eventBus.once('class2css:started', () => {
  console.log('Started for the first time');
});
```

#### emit()

触发事件。

```javascript
emit(eventName: string, data?: any): void
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| eventName | string | 是 | 事件名称 |
| data | any | 否 | 事件数据 |

**示例**:

```javascript
eventBus.emit('custom:event', { message: 'Hello' });
```

#### off()

移除事件监听器。

```javascript
off(eventName: string, handler?: Function): void
```

**示例**:

```javascript
// 移除特定处理函数
eventBus.off('parser:completed', myHandler);

// 移除所有监听器
eventBus.off('parser:completed');
```

#### clear()

清除所有事件监听器。

```javascript
clear(): void
```

**示例**:

```javascript
eventBus.clear();
```

### ConfigManager

配置管理器，处理配置加载和验证。

#### getConfig()

获取完整配置。

```javascript
getConfig(): object
```

**返回值**: 配置对象

**示例**:

```javascript
const config = configManager.getConfig();
console.log('Base unit:', config.system.baseUnit);
```

#### getSystemConfig()

获取系统配置。

```javascript
getSystemConfig(): object
```

**返回值**: 系统配置对象

**示例**:

```javascript
const systemConfig = configManager.getSystemConfig();
console.log('Unit conversion:', systemConfig.unitConversion);
```

#### getOutputConfig()

获取输出配置。

```javascript
getOutputConfig(): object
```

**返回值**: 输出配置对象

**示例**:

```javascript
const outputConfig = configManager.getOutputConfig();
console.log('Output path:', outputConfig.path);
```

#### getCssNameMap()

获取 CSS 名称映射。

```javascript
getCssNameMap(): Map
```

**返回值**: CSS 名称映射 Map

**示例**:

```javascript
const cssNameMap = configManager.getCssNameMap();
console.log('Has margin:', cssNameMap.has('m'));
```

#### getBaseUnit()

获取基础单位。

```javascript
getBaseUnit(): string
```

**返回值**: 基础单位字符串

**示例**:

```javascript
const baseUnit = configManager.getBaseUnit();
console.log('Base unit:', baseUnit); // 'rpx'
```

#### getUnitConversion()

获取单位转换比例。

```javascript
getUnitConversion(): number
```

**返回值**: 转换比例数值

**示例**:

```javascript
const conversion = configManager.getUnitConversion();
console.log('Conversion:', conversion); // 2
```

#### reloadConfig()

重新加载配置。

```javascript
async reloadConfig(): Promise<void>
```

**返回值**: `Promise<void>`

**示例**:

```javascript
await configManager.reloadConfig();
console.log('Config reloaded');
```

**触发事件**:
- `config:reloaded` - 配置重新加载完成

### StateManager

状态管理器，管理全局状态。

#### updateClassListSet()

更新类列表集合。

```javascript
updateClassListSet(classList: Set<string>): void
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| classList | Set<string> | 是 | 类名集合 |

**示例**:

```javascript
const classList = new Set(['m-10', 'p-20', 'w-100']);
stateManager.updateClassListSet(classList);
```

#### getClassListSet()

获取类列表集合。

```javascript
getClassListSet(): Set<string>
```

**返回值**: 类名集合

**示例**:

```javascript
const classList = stateManager.getClassListSet();
console.log('Total classes:', classList.size);
```

#### getStats()

获取统计信息。

```javascript
getStats(): object
```

**返回值**:

```typescript
{
  totalClasses: number;
  dynamicClasses: number;
  staticClasses: number;
}
```

**示例**:

```javascript
const stats = stateManager.getStats();
console.log('Statistics:', stats);
```

#### isScanning()

检查是否正在扫描。

```javascript
isScanning(): boolean
```

**返回值**: 布尔值

**示例**:

```javascript
if (stateManager.isScanning()) {
  console.log('Scanning in progress...');
}
```

#### setScanning()

设置扫描状态。

```javascript
setScanning(scanning: boolean): void
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| scanning | boolean | 是 | 是否正在扫描 |

**示例**:

```javascript
stateManager.setScanning(true);
```

### CacheManager

缓存管理器，处理各种缓存。

#### getFileCache()

获取文件缓存。

```javascript
getFileCache(filePath: string): string | null
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| filePath | string | 是 | 文件路径 |

**返回值**: 文件内容或 null

**示例**:

```javascript
const content = cacheManager.getFileCache('./index.wxml');
if (content) {
  console.log('Cache hit');
}
```

#### setFileCache()

设置文件缓存。

```javascript
setFileCache(filePath: string, content: string): void
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| filePath | string | 是 | 文件路径 |
| content | string | 是 | 文件内容 |

**示例**:

```javascript
cacheManager.setFileCache('./index.wxml', content);
```

#### clearFileCache()

清除文件缓存。

```javascript
clearFileCache(filePath?: string): void
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| filePath | string | 否 | 文件路径（不提供则清除所有） |

**示例**:

```javascript
// 清除特定文件缓存
cacheManager.clearFileCache('./index.wxml');

// 清除所有文件缓存
cacheManager.clearFileCache();
```

#### getCacheStats()

获取缓存统计。

```javascript
getCacheStats(): object
```

**返回值**:

```typescript
{
  file: {
    size: number;
    hitRate: number;
  };
  cssGeneration: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  memoryUsage: {
    kb: number;
    mb: number;
  };
}
```

**示例**:

```javascript
const stats = cacheManager.getCacheStats();
console.log('Cache hit rate:', stats.file.hitRate);
console.log('Memory usage:', stats.memoryUsage.mb, 'MB');
```

## 工具模块 API

### Logger

日志工具，提供统一的日志输出。

#### info()

输出信息日志。

```javascript
info(message: string, ...args: any[]): void
```

**示例**:

```javascript
logger.info('Processing file:', filePath);
```

#### warn()

输出警告日志。

```javascript
warn(message: string, ...args: any[]): void
```

**示例**:

```javascript
logger.warn('Config not found, using default');
```

#### error()

输出错误日志。

```javascript
error(message: string, ...args: any[]): void
```

**示例**:

```javascript
logger.error('Failed to parse file:', error);
```

#### debug()

输出调试日志。

```javascript
debug(message: string, ...args: any[]): void
```

**示例**:

```javascript
logger.debug('Cache stats:', cacheStats);
```

#### setLevel()

设置日志级别。

```javascript
setLevel(level: string): void
```

**参数**:

| 参数 | 类型 | 可选值 | 说明 |
|------|------|--------|------|
| level | string | `'debug'` \| `'info'` \| `'warn'` \| `'error'` | 日志级别 |

**示例**:

```javascript
logger.setLevel('debug');
```

#### setDebugMode()

设置调试模式。

```javascript
setDebugMode(enabled: boolean): void
```

**示例**:

```javascript
logger.setDebugMode(true);
```

### UnitProcessor

单位处理器，处理单位转换和检测。

#### processValue()

处理数值和单位。

```javascript
processValue(value: string, property: string, config: object): string
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| value | string | 是 | 原始值 |
| property | string | 是 | CSS 属性名 |
| config | object | 是 | 配置对象 |

**返回值**: 处理后的值

**示例**:

```javascript
const result = unitProcessor.processValue('10', 'margin', config);
console.log(result); // '20rpx'
```

#### detectUnit()

检测值中的单位。

```javascript
detectUnit(value: string): { value: number, unit: string }
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| value | string | 是 | 包含单位的值 |

**返回值**: 包含数值和单位的对象

**示例**:

```javascript
const result = unitProcessor.detectUnit('10px');
console.log(result); // { value: 10, unit: 'px' }
```

### ConfigValidator

配置验证器，验证配置正确性。

#### validateConfig()

验证配置。

```javascript
validateConfig(config: object): ValidationResult
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| config | object | 是 | 配置对象 |

**返回值**:

```typescript
{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

**示例**:

```javascript
const result = validator.validateConfig(config);
if (!result.isValid) {
  console.error('Config errors:', result.errors);
}
```

#### autoFix()

自动修复配置问题。

```javascript
autoFix(config: object): object
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| config | object | 是 | 配置对象 |

**返回值**: 修复后的配置对象

**示例**:

```javascript
const fixedConfig = validator.autoFix(config);
```

## 事件系统

Class2CSS 使用事件驱动架构，以下是所有可用事件。

### 生命周期事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `class2css:started` | - | Class2CSS 启动完成 |
| `class2css:stopped` | - | Class2CSS 停止完成 |

### 配置事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `config:loaded` | `config: object` | 配置加载完成 |
| `config:reloaded` | `config: object` | 配置重新加载完成 |
| `config:error` | `error: Error` | 配置加载错误 |

### 文件事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `file:changed` | `filePath: string` | 文件变更 |
| `file:added` | `filePath: string` | 文件添加 |
| `file:removed` | `filePath: string` | 文件删除 |

### 解析事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `parser:started` | `filePath: string` | 开始解析 |
| `parser:completed` | `stats: object` | 解析完成 |
| `parser:error` | `error: Error` | 解析错误 |

### 生成事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `generator:dynamic:started` | - | 开始生成动态类 |
| `generator:dynamic:completed` | `stats: object` | 动态类生成完成 |
| `generator:static:completed` | `stats: object` | 静态类生成完成 |

### 缓存事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `cache:file:hit` | `filePath: string` | 文件缓存命中 |
| `cache:file:miss` | `filePath: string` | 文件缓存未命中 |
| `cache:file:updated` | `filePath: string` | 文件缓存更新 |
| `cache:cleared` | - | 缓存已清除 |

### 日志事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `log:info` | `message: string` | 信息日志 |
| `log:warn` | `message: string` | 警告日志 |
| `log:error` | `message: string` | 错误日志 |
| `log:debug` | `message: string` | 调试日志 |

## 使用示例

### 基本使用

```javascript
const Class2CSS = require('class2css');

// 创建实例
const tool = new Class2CSS({
  configPath: './class2css.config.js'
});

// 启动
await tool.start();

// 获取状态
const status = tool.getStatus();
console.log('Status:', status);

// 停止
await tool.stop();
```

### 监听事件

```javascript
const eventBus = tool.getEventBus();

// 监听解析完成
eventBus.on('parser:completed', (stats) => {
  console.log('Parsed classes:', stats.totalCount);
});

// 监听生成完成
eventBus.on('generator:dynamic:completed', (stats) => {
  console.log('Generated:', stats.generatedCount);
});

// 监听错误
eventBus.on('log:error', (error) => {
  console.error('Error occurred:', error);
});
```

### 手动处理文件

```javascript
// 处理单个文件
await tool.handleFileChange('./pages/index.wxml');

// 执行全量扫描
await tool.performFullScan();
```

### 访问内部模块

```javascript
const modules = tool.getModules();
const { configManager, cacheManager, logger } = modules;

// 获取配置
const config = configManager.getConfig();
console.log('Config:', config);

// 查看缓存统计
const cacheStats = cacheManager.getCacheStats();
console.log('Cache stats:', cacheStats);

// 设置日志级别
logger.setLevel('debug');
```

### 配置验证

```javascript
const { ConfigValidator } = require('class2css');

const validator = new ConfigValidator(eventBus);
const result = validator.validateConfig(config);

if (!result.isValid) {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
  
  // 自动修复
  const fixedConfig = validator.autoFix(config);
  console.log('Fixed config:', fixedConfig);
}
```

### 配置诊断

```javascript
const { ConfigDiagnostics } = require('class2css');

const diagnostics = new ConfigDiagnostics(eventBus, configManager);
const results = await diagnostics.runFullDiagnostics();

// 生成报告
const report = diagnostics.generateReport();
console.log(report);

// 获取优化建议
const suggestions = diagnostics.generateOptimizationSuggestions();
console.log('Suggestions:', suggestions);
```

### 自定义事件处理

```javascript
// 创建自定义事件处理器
class CustomHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.setupListeners();
  }

  setupListeners() {
    this.eventBus.on('parser:completed', this.onParseComplete.bind(this));
    this.eventBus.on('generator:dynamic:completed', this.onGenerateComplete.bind(this));
  }

  onParseComplete(stats) {
    console.log('Parse completed:', stats);
    // 自定义处理逻辑
  }

  onGenerateComplete(stats) {
    console.log('Generate completed:', stats);
    // 自定义处理逻辑
  }
}

// 使用
const handler = new CustomHandler(tool.getEventBus());
```

### 性能监控

```javascript
// 监控缓存性能
setInterval(() => {
  const stats = cacheManager.getCacheStats();
  console.log('Cache hit rate:', stats.file.hitRate);
  console.log('Memory usage:', stats.memoryUsage.mb, 'MB');
}, 10000);

// 监控解析性能
let parseCount = 0;
let parseTime = 0;

eventBus.on('parser:started', () => {
  parseTime = Date.now();
});

eventBus.on('parser:completed', () => {
  parseCount++;
  const duration = Date.now() - parseTime;
  console.log(`Parse #${parseCount} took ${duration}ms`);
});
```

## TypeScript 类型定义

```typescript
// 主类
declare class Class2CSS {
  constructor(options?: Class2CSSOptions);
  start(): Promise<void>;
  stop(): Promise<void>;
  handleFileChange(filePath: string): Promise<void>;
  performFullScan(): Promise<void>;
  getStatus(): Status;
  getEventBus(): EventBus;
  getModules(): Modules;
}

// 配置选项
interface Class2CSSOptions {
  configPath?: string;
  cacheSize?: number;
  logger?: LoggerOptions;
}

interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  enableDebug?: boolean;
  enableTimestamp?: boolean;
}

// 状态
interface Status {
  isRunning: boolean;
  stats: Stats;
  config: Config;
}

interface Stats {
  totalClasses: number;
  dynamicClasses: number;
  staticClasses: number;
}

// 事件总线
declare class EventBus {
  on(eventName: string, handler: Function): void;
  once(eventName: string, handler: Function): void;
  emit(eventName: string, data?: any): void;
  off(eventName: string, handler?: Function): void;
  clear(): void;
}
```

---

> 💡 更多使用示例请参考项目中的 `src/example.js` 文件。

