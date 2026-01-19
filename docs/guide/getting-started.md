# 快速开始

你将完成：安装 → 写最小配置 → 运行生成 → 在模板中使用类名。

## 安装

```bash
npm install class2css --save-dev
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

## 创建最小配置

在项目根目录创建 `class2css.config.js`：

```javascript
module.exports = {
  system: { baseUnit: 'rpx', unitConversion: 2, cssFormat: 'compressed' },
  output: {
    path: '../dist',
    fileName: 'styles.wxss',
  },
  cssName: {
    m: { classArr: ['margin'], unit: 'rpx' },
    w: { classArr: ['width'], unit: 'rpx' },
    h: { classArr: ['height'], unit: 'rpx' },
  },
};
```

:::tip 下一步
把配置写“可维护”，并开启单位策略/排序/诊断等能力：建议直接阅读 [配置指南](./config.md) 并从示例配置改起。
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

