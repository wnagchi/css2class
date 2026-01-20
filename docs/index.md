---
home: true
title: Class2CSS
titleTemplate: false

hero:
  name: Class2CSS
  text: 面向微信小程序的原子化 CSS 生成器
  tagline: 扫描 WXML/HTML 类名 → 生成 wxss/css。内置单位策略、配置校验、缓存与增量模式，让“写类名”变成稳定的工程能力。
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/getting-started
    - theme: alt
      text: 查看配置
      link: /guide/config

features:
  - title: 类名即规则
    details: 用 `m-10`、`w-100` 这类表达直接生成样式，避免手写重复 CSS，保持风格一致。
  - title: 智能单位策略
    details: 支持 rpx/px 等单位；可自动检测用户单位，并按属性设置默认单位与转换比例。
  - title: 增量只增不删
    details: 统一文件模式支持“只增不删”与 `appendDelta` 追加写入，兼顾性能与可控性。
  - title: 配置诊断与兼容
    details: 新旧配置无缝兼容；冲突检测、健康检查与建议，减少“配置写错但没发现”的成本。
---

## Quick start

安装：

```bash
npm install css2class --save-dev
```

复制示例配置（推荐）：

- **小程序（wxss / rpx）**：`examples/weapp/class2css.config.js` + `examples/weapp/styles.config.js`
- **Web（css / px）**：`examples/web/class2css.config.js` + `examples/web/styles.config.js`

你可以直接用 `-c` 指定示例配置启动：

```bash
class2css -c ./examples/weapp/class2css.config.js
# 或
class2css -c ./examples/web/class2css.config.js
```

启动（监听模式）：

```bash
npm run start            # 默认使用根目录配置：./class2css.config.js
npm run example:web      # 显式跑 web 示例
npm run example:weapp    # 显式跑 weapp 示例
```

在模板里使用类名：

```html
<view class="m-10 w-100 h-200"></view>
```

## 下一步

- **从零跑通一次**：阅读 [快速开始](./guide/getting-started.md)
- **了解命令**：查看 [CLI](./guide/cli.md)
- **把配置写“正确且可维护”**：阅读 [配置指南](./guide/config.md)
- **大型项目优化**：了解 [增量模式（只增不删）](./guide/incremental.md)
