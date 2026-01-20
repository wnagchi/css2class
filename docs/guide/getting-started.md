# 快速开始

你将完成：安装 → 写最小配置 → 运行生成 → 在模板中使用类名。

## 安装

```bash
npm install css2class --save-dev
```

:::tip 推荐
如果你希望用一条命令直接跑起来，也可以使用 `npx class2css`（前提是已安装到项目里）。
:::

## 运行方式

### 监听模式（开发）

```bash
# 启动工具（默认监听模式）
npm run start

# 开发模式（文件监听）
npm run dev
```

### 单次构建（CI/构建）

```bash
# 构建模式（单次扫描后退出，不监听）
npm run build
```

### 帮助与版本

```bash
npm run help
npm run version
```

## 复制示例配置（推荐）

本项目的配置项较多（并且当前版本运行时依赖 `multiFile`、`atomicRules` 等字段），**不建议从零手写**。

直接从仓库内置示例复制即可：

- **小程序（wxss / rpx）**：复制 `examples/weapp/` 下的 `class2css.config.js` + `styles.config.js`
- **Web（css / px）**：复制 `examples/web/` 下的 `class2css.config.js` + `styles.config.js`

复制后你有两种启动方式：

- **方式 A（推荐）**：用 `-c` 指定示例配置（不需要改默认文件名）
  - `class2css -c ./examples/weapp/class2css.config.js`
  - `class2css -c ./examples/web/class2css.config.js`
- **方式 B**：把示例配置放到项目根目录并改名为默认配置文件
  - `class2css.config.js`
  - `styles.config.js`

:::tip 下一步
示例配置里把路径/输出都写成相对路径了，你只需要改 `multiFile.entry.path`（扫描/监听入口）和 `multiFile.output`（输出位置/文件名）即可跑通。
:::

## 使用类名

```html
<view class="m-10 w-100 h-200"></view>
```

你会得到类似（取决于单位配置）：

```css
.m-10 { margin: 20rpx; }
.w-100 { width: 200rpx; }
.h-200 { height: 400rpx; }
```

## 下一步

- 先把“语法与规则”弄清楚：阅读 [类名语法与生成规则](./concepts.md)
- 需要知道有哪些命令：阅读 [CLI](./cli.md)
- 想性能更稳：了解 [增量模式（只增不删）](./incremental.md)

