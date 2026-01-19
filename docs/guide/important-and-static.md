# Important 与静态类

本页解释两件事：

- **Important 标识**：如何用后缀把某条规则变成 `!important`
- **静态类**：如何把一段固定 CSS 作为“预设类”注册并复用

## Important 标识

### 使用方式

```html
<view class="m-10-i p-20-i"></view>
```

会生成：

```css
.m-10-i { margin: 20rpx !important; }
.p-20-i { padding: 40rpx !important; }
```

### 配置：importantFlags

你可以配置允许的后缀列表：

```js
module.exports = {
  importantFlags: {
    suffix: ['-i', '_i'], // 例如 w-100-i / w-100_i
  },
};
```

:::warning 注意
Important 只是在生成规则时追加 `!important`，它无法替代更合理的样式组织。建议只在“必须覆盖第三方样式/遗留样式”时使用。
:::

## 静态类（baseClassName）

静态类适合放“不会变化的片段”，例如布局容器、常用 flex 组合等：

```js
module.exports = {
  baseClassName: {
    container: 'max-width: 1200rpx; margin: 0 auto;',
    flex: 'display: flex;',
    'flex-center': 'display: flex; justify-content: center; align-items: center;',
  },
};
```

使用：

```html
<view class="container flex-center"></view>
```

:::tip 经验
静态类适合“语义化的组合”，原子类适合“可参数化的规则”。两者结合往往比单独使用更好维护。
:::

## 下一步

- 类名解析全貌：阅读 [类名语法与生成规则](./concepts.md)
- 单位策略：阅读 [单位与转换策略](./units.md)

