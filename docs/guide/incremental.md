# 增量模式（只增不删）与 appendDelta

增量模式是 Class2CSS 的高级功能，主要用于**统一文件模式（`cssOutType: 'uniFile'`）**，解决"历史输出文件累积了旧 class，不希望工具主动删除"的场景。

:::tip 什么时候值得用
当你的项目很大、写入频繁，或者输出文件会被外部工具/人工修改时，增量模式能显著降低“全量重写”的 I/O 成本，同时让输出更可控。
:::

## 适用场景

- 输出文件可能被其他工具或手动编辑修改
- 希望保留历史生成的 class，即使当前项目暂时未使用
- 需要更快的增量更新性能（appendDelta 模式）

## 配置选项

### incrementalOnlyAdd

启用"只增不删"模式。

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：当设置为 `true` 时，运行期新增的 class 会被保护，不会因为后续文件变化而删除。

### incrementalBaseline

基线来源策略。

- **类型**：`string`
- **默认值**：`'fromOutputFile'`
- **可选值**：
  - `'fromOutputFile'`：从输出文件中解析已存在的 class 作为基线

### rebuildOnStart

启动时是否重建输出文件。

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：开启后会全量扫描并覆盖写出一次，输出文件会被"清理到只包含当前项目使用的 class"，然后进入运行期只增不删。推荐开启，保证每次启动输出文件都是干净且排序好的。

### unusedReportLimit

未使用 class 报告的最大显示数量。

- **类型**：`number`
- **默认值**：`200`
- **说明**：启动重建时，如果发现上一版输出文件中存在但当前项目未使用的 class，会在控制台打印。此配置限制打印的示例数量，避免输出过长。

### uniFileWriteMode

统一文件写入策略。

- **类型**：`string`
- **默认值**：`'rewrite'`
- **可选值**：
  - `'rewrite'`：统一文件写入保持兼容（防抖全量覆盖写）
  - `'appendDelta'`：启动时写入 BASE 段 + `DELTA_START` 标记；运行期仅把新增 class 的 CSS 追加到文件末尾（更快、减少重写）

**注意**：当 `uniFileWriteMode='appendDelta'` 时，`rebuildOnStart` 必须为 `true`（否则历史垃圾无法自动清理）。

## 配置示例

```javascript
module.exports = {
  multiFile: {
    entry: {
      path: "./src", // 需要扫描/监听的目录
      fileType: ["wxml", "html"],
    },
    output: {
      cssOutType: "uniFile",
      path: "./dist",
      fileName: "styles.wxss",

      // 增量"只增不删"
      incrementalOnlyAdd: true,
      incrementalBaseline: "fromOutputFile",
      rebuildOnStart: true,
      unusedReportLimit: 200,

      // 统一文件写入策略
      uniFileWriteMode: "appendDelta", // or 'rewrite'
    },
  },
};
```

## appendDelta 模式

`appendDelta` 模式提供了更快的增量更新性能，通过追加写入而非全量重写来减少文件 I/O。

### 输出文件结构

`appendDelta` 模式下输出文件会包含标记：

```css
/* CLASS2CSS:BASE */
.w-100 { width: 200rpx; }
.m-10 { margin: 20rpx; }
/* ... 其他基础样式 ... */

/* CLASS2CSS:DELTA_START */
.new-class-1 { /* 新增的样式 */ }
.new-class-2 { /* 新增的样式 */ }
```

- `/* CLASS2CSS:BASE */`：启动重建写入的基础段（压缩/排序后的全量结果）
- `/* CLASS2CSS:DELTA_START */`：增量追加段起点（运行期新增 class 会追加到该标记之后）

### 工作流程

1. **启动时**：
   - 读取旧输出文件，提取已存在的 class 作为基线
   - 执行全量扫描，清理上一次运行累积的多余规则
   - 生成 BASE CSS（全量生成，压缩+排序）
   - 写入 BASE + DELTA_START 标记（覆盖写，清空旧 DELTA）
   - 报告未使用的 class（如果存在）

2. **运行期**：
   - 文件变更时，只追加新增 class 的 CSS 到 DELTA_START 之后
   - 新增的 class 自动加入 baseline，保证只增不删

### 优势

- **性能提升**：只追加新增内容，避免全量重写
- **减少 I/O**：文件写入次数和大小显著减少
- **保持基线**：BASE 段保持压缩和排序，DELTA 段追加新内容

### 注意事项

- `rebuildOnStart` 必须为 `true`，否则历史垃圾无法自动清理
- DELTA 段会随时间增长，建议定期重建（重启工具即可）
- 如果需要完全清理，可以手动删除输出文件后重启

## 标准模式 vs 增量模式

### 标准模式（incrementalOnlyAdd: false）

- 文件变更时，会删除不再使用的 class
- 输出文件始终保持"干净"，只包含当前使用的 class
- 适合：希望输出文件始终保持最小化的场景

### 增量模式（incrementalOnlyAdd: true）

- 文件变更时，只新增 class，不删除已存在的 class
- 输出文件可能随时间增长
- 适合：需要保留历史 class 或输出文件可能被外部修改的场景

## 最佳实践

1. **推荐开启 rebuildOnStart**：保证每次启动输出文件都是干净且排序好的
2. **定期检查未使用的 class**：关注启动时的 unused 报告
3. **使用 appendDelta 提升性能**：在大型项目中，appendDelta 模式可以显著提升增量更新速度
4. **合理设置 unusedReportLimit**：避免控制台输出过长

## 下一步

- 了解统一文件输出与基础配置：阅读 [配置指南](./config.md)
