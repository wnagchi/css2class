# 类名语法与生成规则

Class2CSS 的核心是：**把“类名”解析成一条 CSS 规则**。你只需要定义“前缀 → CSS 属性”的映射（`cssName`），剩下的值解析、单位策略、Important、排序/压缩等由工具处理。

## 基本语法

最常用的形式是：

`<key>-<value>`

- **`key`**：在 `cssName` 里定义的前缀（例如 `m`、`w`、`text`）
- **`value`**：数值 / 特殊值 / 带单位值（例如 `10`、`50px`、`auto`）

示例：

```html
<view class="m-10 w-100 h-200"></view>
```

对应（以 `baseUnit=rpx`、`unitConversion=2` 为例）：

```css
.m-10 { margin: 20rpx; }
.w-100 { width: 200rpx; }
.h-200 { height: 400rpx; }
```

## 带单位值 vs 自动单位

在 `unitStrategy.autoDetect=true` 时：

- **写了单位**：保持你写的单位（例如 `w-50px` → `50px`）
- **没写单位**：使用配置的默认单位和转换比例（例如 `w-100` → `200rpx`）

```html
<view class="w-50px h-auto"></view>
```

## 重要性（Important）

可以通过后缀标识生成 `!important`，例如：

```html
<view class="m-10-i p-20-i"></view>
```

具体后缀规则由 `importantFlags.suffix` 控制，详见 [Important 与静态类](./important-and-static.md)。

## 静态类（预设片段）

你也可以把一段固定 CSS 作为“静态类”注册到 `baseClassName`，例如：

```html
<view class="container flex-center"></view>
```

详见 [Important 与静态类](./important-and-static.md)。

## 下一步

- 想把单位处理写得更稳：阅读 [单位与转换策略](./units.md)
- 想系统了解所有配置：阅读 [配置指南](./config.md)

