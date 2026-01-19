# 规则参考（当前模板已内置）

本页把仓库默认的 `class2css.config.js` 里**已经实现**的规则，按使用习惯（边距 / 宽高 / 文字 / 颜色 / 布局 / 自定义）整理成一份“像 Tailwind 一样可查”的参考。

:::tip 提示
动态类的通用格式是：`<prefix>-<value>`。  
当前实现会把 **`value` 当成一段整体字符串**，因此 **`value` 里不要再包含 `-`**（例如不支持 `m--10` 这种负数写法）。
:::

## 值（value）的写法

对大多数动态类（例如 `m-10`、`w-100`）：

- **纯数字**：会按 `unitConversion` 转换，并追加默认单位（如 `rpx`）
- **带单位**：保持你写的单位（如 `w-50px`、`top-10rpx`）
- **关键字**：保持原样（如 `w-auto`、`h-auto`）

:::warning 注意
为了生成合法的 CSS，**不建议**在 class 名里使用 `%` 之类的特殊字符（虽然解析可能通过，但 CSS 选择器会变得难以匹配/需要转义）。
:::

---

## 边距 / 内边距 / 间距（`atomicRules.spacing`）

### Margin

- **`m-{n}`**：`margin`
- **`mt-{n}`**：`margin-top`
- **`mr-{n}`**：`margin-right`
- **`mb-{n}`**：`margin-bottom`
- **`ml-{n}`**：`margin-left`
- **`mx-{n}`**：`margin-left` + `margin-right`
- **`my-{n}`**：`margin-top` + `margin-bottom`

示例：

```html
<view class="m-10 mt-20 mx-12"></view>
```

### Padding

- **`p-{n}`**：`padding`
- **`pt-{n}`**：`padding-top`
- **`pr-{n}`**：`padding-right`
- **`pb-{n}`**：`padding-bottom`
- **`pl-{n}`**：`padding-left`
- **`px-{n}`**：`padding-left` + `padding-right`
- **`py-{n}`**：`padding-top` + `padding-bottom`

### Gap

- **`gap-{n}`**：`gap`

---

## 宽高 / 尺寸（`atomicRules.sizing`）

- **`w-{n}`**：`width`
- **`h-{n}`**：`height`
- **`max-w-{n}`**：`max-width`
- **`max-h-{n}`**：`max-height`
- **`min-w-{n}`**：`min-width`
- **`min-h-{n}`**：`min-height`
- **`size-{n}`**：`width` + `height`（兼容写法）

示例：

```html
<view class="w-100 h-200 max-w-600 min-h-300"></view>
```

同时，你还内置了一些“静态尺寸类”（见下方 **布局/显示**）：

- **`w-full`**：`width: 100%`
- **`h-full`**：`height: 100%`
- **`w-screen`**：`width: 100vw`
- **`h-screen`**：`height: 100vh`

---

## 文字（字号/粗细/行高/字距/对齐）

### 字号（`atomicRules.typography`）

- **`text-{n}`**：`font-size`
- **`text-size-{n}`**：`font-size`（更明确的别名，用来避免歧义）

示例：

```html
<text class="text-14"></text>
<text class="text-size-16"></text>
```

### 字重（两种方式）

1) 动态（`atomicRules.typography`）

- **`font-{n}`**：`font-weight`（例如 `font-700`）

2) 静态（`baseClassName`）

- **`bold-thin`/`bold-light`/`bold-medium`/`bold-bold`/`bold-black`** 等（固定 `font-weight`）

### 行高 / 字间距（`atomicRules.typography`）

- **`leading-{n}`**：`line-height`（通常建议用更可控的单位写法，例如 `leading-24px`）
- **`tracking-{n}`**：`letter-spacing`

### 文本对齐（静态，`baseClassName`）

- **`text-left`**
- **`text-center`**
- **`text-right`**
- **`text-justify`**

### 文本装饰/省略（静态，`baseClassName`）

- **`underline`**
- **`line-through`**
- **`ellipsis`**：`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`

---

## 颜色（文字颜色/背景色/边框色）

颜色来自 `baseClassName` 中的三类“颜色族”：

- **`color-{token}`**：`color`
- **`bg-{token}`**：`background-color`
- **`bcolor-{token}`**：`border-color`

其中 `{token}` 来自你的颜色表（`baseColor`），例如：

```html
<text class="color-red"></text>
<view class="bg-fafafa bcolor-cccccc"></view>
```

:::tip
如果你在 `class2css.config.js` 里往 `baseColor` 里加了 `brand: '#12b7f5'`，那么你立刻就能用 `color-brand/bg-brand/bcolor-brand`。
:::

---

## 布局 / 显示（静态类，`baseClassName`）

### Display

- **`block`**, **`inline`**, **`inline-block`**
- **`flex`**, **`inline-flex`**
- **`grid`**, **`inline-grid`**
- **`table`**
- **`hidden`**

### Flexbox（组合类）

- **`flex-row`**, **`flex-col`**
- **`flex-wrap`**, **`flex-nowrap`**
- **`items-start`**, **`items-center`**, **`items-end`**, **`items-stretch`**
- **`justify-start`**, **`justify-center`**, **`justify-end`**, **`justify-between`**, **`justify-around`**, **`justify-evenly`**
- **`flex-1`**, **`shrink-0`**
- **`flex-cen`**：`align-items: center; justify-content: center;`（注意：不包含 `display:flex`，通常配合 `flex` 一起用）

### Grid

- **`grid-cols-2`** / **`grid-cols-3`** / **`grid-cols-4`** / …（模板里包含多种列数）

### 定位（静态 + 动态）

静态：

- **`static`**, **`fixed`**, **`absolute`**, **`relative`**, **`sticky`**

动态（`atomicRules.positioning`）：

- **`top-{n}`**, **`right-{n}`**, **`bottom-{n}`**, **`left-{n}`**
- **`inset-{n}`**：四个方向
- **`inset-x-{n}`**：左右
- **`inset-y-{n}`**：上下

### 溢出（静态）

- **`overflow-auto`**, **`overflow-hidden`**, **`overflow-visible`**, **`overflow-scroll`**
- **`overflow-x-auto`**, **`overflow-x-hidden`**, **`overflow-x-scroll`**
- **`overflow-y-auto`**, **`overflow-y-hidden`**, **`overflow-y-scroll`**

### 光标（静态）

- **`cursor-auto`**, **`cursor-default`**, **`cursor-pointer`**, **`cursor-wait`**
- **`cursor-text`**, **`cursor-move`**, **`cursor-not-allowed`**

### 盒模型（静态）

- **`box-border`**（`box-sizing: border-box`）
- **`box-content`**（`box-sizing: content-box`）

---

## 边框 / 圆角（`atomicRules.borders` + 静态类）

动态：

- **`rounded-{n}`**：`border-radius`
- **`border-{n}`**：`border-width`
- **`bordert-{n}`** / **`borderr-{n}`** / **`borderb-{n}`** / **`borderl-{n}`**
- **`b_r-{n}`**：`border-radius`（兼容别名）

静态：

- **`border-solid`**, **`border-dashed`**, **`border-dotted`**, **`border-none`**

---

## 效果（`atomicRules.effects`）

- **`opacity-{n}`**：`opacity`
  - 推荐用 `0~100` 的整数：例如 `opacity-50` → `0.5`
- **`z-{n}`**：`z-index`
- **`transition-{n}`**：`transition`（默认单位 `ms`，并且不会乘 `unitConversion`）
  - 例如 `transition-300` → `transition: 300ms`
- **`op-{n}`**：`opacity` 的别名

---

## Important（`importantFlags`）

你可以给任意类名追加后缀生成 `!important`：

- `-i`：例如 `m-10-i`
- `_i`：例如 `m-10_i`

详见 [Important 与静态类](./important-and-static.md)。

---

## 自定义：如何在这份配置上继续扩展

### 1) 增加一条动态规则（推荐放在 `atomicRules`）

```js
atomicRules: {
  // ...
  effects: {
    // 例如：blur-4 → filter: blur(8rpx)
    blur: { properties: ['filter'], defaultUnit: 'rpx' },
  },
}
```

### 2) 增加一个静态类（推荐放在 `baseClassName`）

```js
baseClassName: {
  // ...
  'safe-area-bottom': 'padding-bottom: env(safe-area-inset-bottom);',
}
```

### 3) 增加一个颜色 token

```js
baseColor: {
  brand: '#12b7f5',
}
```

然后你就能使用：

- `color-brand`
- `bg-brand`
- `bcolor-brand`

