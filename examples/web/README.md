# Web 示例（可直接看效果）

## 1) 生成 CSS（一次）

在仓库根目录执行：

```bash
node bin/class2css.js --no-watch --config ./examples/web/class2css.config.js
```

生成结果：`examples/web/dist/styles.css`

## 2) 打开示例页面

直接用浏览器打开：`examples/web/demo.html`

你会看到页面里使用的 class（例如 `p-24` / `text-20` / `bg-red`）已经生效。

## 3) 开发模式（推荐）

```bash
node bin/class2css.js --config ./examples/web/class2css.config.js
```

然后修改 `demo.html` 里的 class，刷新页面即可看到效果更新。
