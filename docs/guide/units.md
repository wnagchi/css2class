# 单位与转换策略

单位处理是 Class2CSS 最容易“踩坑”也最值得配置清楚的部分。本页用最短路径解释：**什么时候会乘以 `unitConversion`，什么时候会保持原值**。

## 核心规则（当前版本）

- **写了单位**：保持你写的单位（例如 `w-50px` → `50px`，`top-10rpx` → `10rpx`）
- **没写单位且是数字**：按 `unitConversion` 换算，并追加默认单位（通常是 `baseUnit`）
- **部分属性天然无单位**：例如 `opacity`、`z-index`、`font-weight` 等会按“无单位”处理

:::tip
如果你想知道“某个类到底会不会乘 `unitConversion`”，最稳的判断方式是：**它最终落到哪个 CSS 属性**。  
像 `opacity` / `z-index` 这种属性，即使写成 `opacity-50` 也不会加单位。
:::

## 你需要记住的 2 个配置

### baseUnit

默认单位。例如微信小程序常用 `rpx`：

```js
system: { baseUnit: 'rpx' }
```

### unitConversion

转换比例（默认 `2`）：当值是“纯数字”且需要单位时，会乘以比例。

\[
输出值 = 输入值 \times unitConversion
\]

例如 `m-10` 在 `unitConversion=2` 时生成 `20rpx`。

## 常见例子

```html
<view class="w-100 text-14 opacity-50 z-999"></view>
```

在一套典型配置下可能会生成：

- `w-100` → `width: 200rpx;`
- `text-14` → `font-size: 28rpx;`
- `opacity-50` → `opacity: 0.5;`
- `z-999` → `z-index: 999;`

:::warning 注意
`opacity` 的数值会做“百分比语义”处理：当值大于 1 时会除以 100（例如 `opacity-50` → `0.5`）。
:::

## 下一步

- 了解类名解析整体：阅读 [类名语法与生成规则](./concepts.md)
- 查看所有配置项：阅读 [配置指南](./config.md)

