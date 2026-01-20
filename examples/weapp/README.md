# 小程序示例（配置模板）

该目录主要用于提供可复制的配置模板。

## 运行（一次）

在仓库根目录执行：

```bash
node bin/class2css.js --no-watch --config ./examples/weapp/class2css.config.js
```

生成结果：`examples/weapp/dist/styles.wxss`

> 你需要把 `multiFile.entry.path` 改成你的小程序项目源码目录（wxml 所在目录），才会扫描到真实的 class。
