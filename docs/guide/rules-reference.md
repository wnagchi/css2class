# 规则参考（当前模板已内置）

本页把仓库示例配置（`examples/weapp/`）里**已经实现**的规则，按使用习惯（边距 / 宽高 / 文字 / 颜色 / 布局 / 自定义）整理成一份“像 Tailwind 一样可查”的参考。

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
为了生成合法的 CSS，**不建议**在 class 名里直接出现 `%` 等特殊字符（选择器会变得难以匹配/需要转义）。  
推荐做法：用颜色 token（`bg-xxxx`）或写成带单位的安全值（`w-50px` / `w-10rpx`）。
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

## 宽高 / 尺寸（`atomicRules.sizing` + 静态类）

动态：

- **`w-{n}`**：`width`
- **`h-{n}`**：`height`
- **`max-w-{n}`**：`max-width`
- **`max-h-{n}`**：`max-height`
- **`min-w-{n}`**：`min-width`
- **`min-h-{n}`**：`min-height`
- **`size-{n}`**：`width` + `height`（兼容写法）

静态：

- **`w-full`**：`width: 100%`
- **`h-full`**：`height: 100%`
- **`w-screen`**：`width: 100vw`
- **`h-screen`**：`height: 100vh`

示例：

```html
<view class="w-100 h-200 max-w-600 min-h-300 w-full"></view>
```

---

## 文字（字号/粗细/行高/字距/对齐/装饰）

### 字号（`atomicRules.typography`）

- **`text-{n}`**：`font-size`
- **`text-size-{n}`**：`font-size`（更明确的别名，用来避免歧义）

```html
<text class="text-14"></text>
<text class="text-size-16"></text>
```

### 字重（两种方式）

动态（`atomicRules.typography`）：

- **`font-{n}`**：`font-weight`（例如 `font-700`）

静态（`baseClassName`）：

- **`bold-thin`**（100）
- **`bold-extralight`**（200）
- **`bold-light`**（300）
- **`bold-normal`**（400）
- **`bold-medium`**（500）
- **`bold-semibold`**（600）
- **`bold-bold`**（700）
- **`bold-extrabold`**（800）
- **`bold-black`**（900）
- **`bold`**（`font-weight: bold;`）

### 行高 / 字间距（`atomicRules.typography`）

- **`leading-{n}`**：`line-height`
- **`tracking-{n}`**：`letter-spacing`

:::tip
`leading` 默认是“无单位属性”，建议写成更明确的单位值（例如 `leading-24px` / `leading-32rpx`）。
:::

### 文本对齐（静态）

- **`text-left`** / **`text-center`** / **`text-right`** / **`text-justify`**

### 文本装饰/省略（静态）

- **`underline`**
- **`line-through`**
- **`ellipsis`**：`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`

### 字体族（静态）

- **`font-runyuan`**：`font-family: 'HYRunYuan-BOLD';`

---

## 颜色（文字颜色/背景色/边框色）

颜色来自 `baseClassName` 中的三类“颜色族”：

- **`color-{token}`**：`color`
- **`bg-{token}`**：`background-color`
- **`bcolor-{token}`**：`border-color`

示例：

```html
<text class="color-red"></text>
<view class="bg-fafafa bcolor-cc"></view>
```

:::tip
如果你在 `class2css.config.js` 里往颜色表里加了 `brand: '#12b7f5'`，那么你立刻就能用 `color-brand/bg-brand/bcolor-brand`。
:::

<details>
<summary>当前模板内置的颜色 token（展开查看）</summary>

- 466580
- 818182
- 595959
- 333333
- 666666
- 979797
- 777777
- 142640
- fafafa
- B3B3B3
- F9F9F9
- 9CA6B4
- 040404
- ECF5FF
- black07
- fffffe
- B10A32
- f4
- f4f4f4
- cc
- white
- black
- transparent
- slate
- gray
- gray1
- gray4
- zinc
- red
- orange
- amber
- yellow
- lime
- green
- emerald
- teal
- cyan
- sky
- blue
- indigo
- violet
- purple
- fuchsia
- pink
- rose

</details>

### 直接颜色值写法（无需配置）

除了使用预设的颜色映射（如 `bg-red`、`color-white`），现在支持直接在 class 中写入颜色值。该功能适用于所有带 `ABBR` 的颜色族（`bg`、`color`、`bcolor` 等）。

#### Hex 颜色格式

```html
<!-- 3位 hex -->
<div class="bg-hex-fff">白色背景</div>
<div class="color-hex-000">黑色文字</div>

<!-- 4位 hex（含 alpha） -->
<div class="bg-hex-ffff">不透明白色背景</div>

<!-- 6位 hex -->
<div class="bg-hex-112233">深色背景</div>
<div class="color-hex-ff0000">红色文字</div>

<!-- 8位 hex（含 alpha） -->
<div class="bg-hex-ffffffff">完全不透明白色背景</div>
```

#### RGB 颜色格式

```html
<div class="bg-rgb-255-0-0">红色背景</div>
<div class="color-rgb-0-128-255">蓝色文字</div>
```

#### RGBA 颜色格式

```html
<!-- alpha 值支持多种写法：
     - 两位数字 < 10：除以 10（如 05 → 0.5, 08 → 0.8）
     - 两位数字 >= 10：除以 100 作为百分比（如 50 → 0.5, 99 → 0.99）
     - 下划线分隔：直接替换为点（如 0_5 → 0.5）
     - 其他格式：直接解析（如 1 → 1.0, 0.5 → 0.5）
-->
<div class="bg-rgba-0-0-0-05">半透明黑色背景（05 → 0.5）</div>
<div class="bg-rgba-255-0-0-0_5">半透明红色背景（0_5 → 0.5）</div>
<div class="bg-rgba-0-0-0-50">50% 不透明度黑色背景（50 → 0.5）</div>
<div class="color-rgba-0-0-0-08">80% 不透明度黑色文字（08 → 0.8）</div>
<div class="bg-rgba-255-0-0-99">99% 不透明度红色背景（99 → 0.99）</div>
```

#### 与响应式和 Important 组合使用

```html
<!-- 响应式变体 -->
<div class="sm:bg-hex-fff md:bg-rgb-255-0-0">响应式背景色</div>

<!-- Important 标识 -->
<div class="bg-hex-fff_i">强制白色背景</div>
<div class="!color-rgb-0-0-0">强制黑色文字</div>

<!-- 组合使用 -->
<div class="sm:bg-rgba-255-0-0-05_i">响应式 + Important</div>
```

:::tip 优先级说明
- **映射优先**：如果配置中存在对应的颜色映射（如 `bg-red`），优先使用映射值
- **直接值后备**：只有当映射不存在时，才会尝试解析为直接颜色值
- **解析失败**：如果既不是映射值，也无法解析为有效颜色值，则不会生成 CSS 规则
:::

:::warning 兼容性
- ✅ 完全兼容 Web（HTML/CSS）
- ✅ 完全兼容小程序（WXML/WXSS）
- ✅ 只使用字母、数字、下划线、短横线，无需转义
- ✅ 与现有颜色映射方案完全兼容，不会产生冲突
:::

---

## 布局 / 显示（静态类）

### Display

- **`block`**, **`inline`**, **`inline-block`**
- **`flex`**, **`inline-flex`**
- **`grid`**, **`inline-grid`**
- **`table`**
- **`hidden`**

### Flexbox

- **`flex-row`**, **`flex-col`**
- **`flex-wrap`**, **`flex-nowrap`**
- **`items-start`**, **`items-center`**, **`items-end`**, **`items-stretch`**
- **`justify-start`**, **`justify-center`**, **`justify-end`**, **`justify-between`**, **`justify-around`**, **`justify-evenly`**
- **`flex-1`**, **`shrink-0`**
- **`flex-cen`**：`align-items: center; justify-content: center;`（注意：不包含 `display:flex`，通常配合 `flex` 一起用）

### Grid

<details>
<summary>grid-cols（展开查看）</summary>

- `grid-cols-2`
- `grid-cols-3`
- `grid-cols-4`
- `grid-cols-5`
- `grid-cols-6`
- `grid-cols-7`
- `grid-cols-8`
- `grid-cols-9`
- `grid-cols-10`

</details>

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

