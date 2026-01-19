# 单位与转换策略

单位处理是 Class2CSS 最容易“踩坑”也最值得配置清楚的部分。本页用最短路径解释：**什么时候会乘以 `unitConversion`，什么时候会保持原值**。

## 你需要记住的 3 个配置

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

例如 `m-10`（margin）在 `unitConversion=2` 时生成 `20rpx`。

### unitStrategy.autoDetect

是否自动识别用户输入单位：

- `true`：`w-50px` 保持 `50px`；`w-50` 走默认单位与转换
- `false`：更“严格”，通常配合你在规则里约定单位使用（不建议新手先关）

## propertyUnits：按属性设定默认单位

`propertyUnits` 允许你为不同属性指定默认单位（或无单位）：

```js
system: {
  unitStrategy: {
    autoDetect: true,
    propertyUnits: {
      'font-size': 'rpx',
      'width|height': 'rpx',
      opacity: '',
      'z-index': '',
      'line-height': '',
    },
  },
}
```

含义：

- **值为空字符串 `''`**：表示该属性默认**无单位**
- **`width|height`**：用 `|` 同时匹配多个属性（简化配置）

## 常见例子

```html
<view class="w-100 text-14 opacity-05 z-999"></view>
```

在一套典型配置下可能会生成：

- `w-100` → `width: 200rpx;`
- `text-14` → `font-size: 28rpx;`
- `opacity-05` → `opacity: 0.5;`
- `z-999` → `z-index: 999;`

:::tip 建议
优先把“默认单位/无单位”的规则写进 `propertyUnits`，比在每个 `cssName` 里分散维护更稳定。
:::

## 下一步

- 了解类名解析整体：阅读 [类名语法与生成规则](./concepts.md)
- 查看所有配置项：阅读 [配置指南](./config.md)

