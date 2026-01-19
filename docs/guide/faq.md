# 常见问题

本页按“能最快定位问题”的方式组织：先看现象，再给最短修复路径，最后给进一步的排查方向。

## 配置相关

### 配置冲突

**问题**：出现 `CSS property conflict detected for 'font-size'` 错误

**解决**：
1. 运行配置诊断工具检查冲突：
   ```javascript
   const ConfigDiagnostics = require('class2css/src/utils/ConfigDiagnostics');
   const diagnostics = new ConfigDiagnostics(eventBus, configManager);
   const results = await diagnostics.runFullDiagnostics();
   console.log(diagnostics.generateReport());
   ```
2. 检查 `cssName` 和 `atomicRules` 中是否有重复定义
3. 使用配置验证工具自动修复：
   ```javascript
   const ConfigValidator = require('class2css/src/core/ConfigValidator');
   const validator = new ConfigValidator(eventBus);
   const result = validator.validateConfig(config);
   if (!result.isValid) {
     const fixed = validator.autoFix(config);
   }
   ```

### 单位不一致

**问题**：警告 `Unit inconsistency detected`

**解决**：
1. 启用 `autoDetect`：
   ```javascript
   system: {
     unitStrategy: {
       autoDetect: true,
       propertyUnits: { /* ... */ }
     }
   }
   ```
2. 统一单位配置，确保所有相关配置使用相同的单位

如果你想系统理解单位规则，建议直接阅读 [单位与转换策略](./units.md)。

### 配置文件找不到

**问题**：`Configuration file not found`

**解决**：
1. 确保项目根目录存在 `class2css.config.js`
2. 或使用 `-c` 参数指定配置文件路径：
   ```bash
   class2css -c ./my-config.js
   ```

## 性能相关

### 性能问题

**问题**：CSS 生成速度慢

**解决**：
1. 启用缓存：
   ```javascript
   system: {
     compression: true
   }
   ```
2. 使用增量更新模式
3. 检查文件监听范围，避免监听不必要的目录

### 内存使用过高

**问题**：工具占用内存过多

**解决**：
1. 检查缓存配置，适当降低缓存大小
2. 使用增量模式，减少全量扫描频率
3. 检查是否有大量未使用的 class 累积

## 增量模式相关

### 输出文件不断增长

**问题**：使用增量模式后，输出文件越来越大

**解决**：
1. 这是增量模式的正常行为（只增不删）
2. 定期重启工具，`rebuildOnStart: true` 会自动清理
3. 手动删除输出文件后重启，会重新生成干净的文件

### appendDelta 模式不生效

**问题**：设置了 `uniFileWriteMode: 'appendDelta'` 但没有效果

**解决**：
1. 确保 `rebuildOnStart: true`（appendDelta 模式要求）
2. 确保 `cssOutType: 'uniFile'`
3. 检查输出文件是否包含 `/* CLASS2CSS:BASE */` 和 `/* CLASS2CSS:DELTA_START */` 标记

## 文件监听相关

### 文件变更不触发更新

**问题**：修改文件后，CSS 没有更新

**解决**：
1. 检查文件是否在监听范围内（`multiFile.entry.path`）
2. 检查文件扩展名是否匹配（`multiFile.entry.fileType`）
3. 确认监听模式已启用（未使用 `--no-watch`）
4. 检查文件保存是否完整（某些编辑器可能分步保存）

### 监听延迟

**问题**：文件变更后，CSS 更新有延迟

**解决**：
1. 这是正常的防抖行为，避免频繁更新
2. 延迟通常在 100ms 以内
3. 如需立即更新，可以手动触发全量扫描

## 输出相关

### CSS 格式不正确

**问题**：生成的 CSS 格式不符合预期

**解决**：
1. 检查 `system.cssFormat` 设置：
   - `'multiLine'`：多行格式
   - `'singleLine'`：单行格式
   - `'compressed'`：压缩格式
2. 检查 `system.sortClasses` 是否启用排序

### 输出文件路径错误

**问题**：输出文件不在预期位置

**解决**：
1. 检查 `output.path` 配置（相对路径基于配置文件所在目录）
2. 使用绝对路径避免路径问题
3. 使用 CLI 参数 `-o` 覆盖输出路径：
   ```bash
   class2css -o ./dist
   ```

## 诊断工具

### 运行配置诊断

```javascript
const ConfigDiagnostics = require('class2css/src/utils/ConfigDiagnostics');

const diagnostics = new ConfigDiagnostics(eventBus, configManager);
const results = await diagnostics.runFullDiagnostics();
console.log(diagnostics.generateReport());

// 获取优化建议
const suggestions = diagnostics.generateOptimizationSuggestions();
console.log(suggestions);
```

### 获取优化建议

诊断工具会自动生成优化建议，包括：
- 高优先级：配置错误，必须修复
- 中优先级：配置警告，建议修复
- 低优先级：最佳实践建议

## 其他问题

### 版本兼容性

**问题**：从旧版本升级后出现问题

**解决**：
1. Class2CSS 完全向后兼容旧版配置
2. 旧版配置会自动映射到新版结构
3. 使用兼容性适配器迁移：
   ```javascript
   const CompatibilityAdapter = require('class2css/src/core/CompatibilityAdapter');
   const adapter = new CompatibilityAdapter(eventBus);
   const adaptedConfig = adapter.adaptConfig(oldConfig);
   ```

### 获取帮助

如果以上方法无法解决问题：

1. 查看 [GitHub Issues](https://github.com/wnagchi/css2class/issues)
2. 提交新的 Issue，附上：
   - 配置文件（脱敏后）
   - 错误信息
   - 复现步骤
   - 环境信息（Node 版本、操作系统等）

## 下一步

- 跑通一次并确认输出是否符合预期：阅读 [快速开始](./getting-started.md)
