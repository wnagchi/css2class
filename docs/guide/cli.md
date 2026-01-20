# CLI 使用说明

CLI 适合在 CI 或本地快速覆盖配置（例如临时换输入/输出目录）。你可以直接运行 `class2css`，或者在项目里通过 npm scripts 间接运行。

## 基本用法

```bash
class2css [options]
```

:::tip
如果你是通过本项目自带脚本运行（例如 `npm run start`），本质上也是把参数传给 `class2css`。
:::

## 参数一览

### 配置与模式

- **`-c, --config <path>`**：指定配置文件路径（默认 `./class2css.config.js`）
- **`--no-watch`**：关闭监听模式（执行一次扫描后退出）

### 运行时覆盖（覆盖配置文件）

- **`-i, --input <path>`**：覆盖输入目录（扫描/监听入口）
  - 目前该参数为**单路径**覆盖（对应 `multiFile.entry.path` 的单值用法）
  - 如需多目录/多文件入口，请在配置中使用 `multiFile.entry.path: string[]`
- **`-o, --output <path>`**：覆盖输出目录
- **`-f, --output-file <name>`**：覆盖输出文件名
- **`-t, --output-type <type>`**：覆盖输出类型（`filePath` 或 `uniFile`）

### 文档服务

- **`--docs`**：启用文档服务（与主程序并行运行）
- **`--docs-port <port>`**：指定文档服务端口（默认 5173；若占用则自动寻找下一个可用端口）
- **`--docs-host <host>`**：指定文档服务主机（默认 `127.0.0.1`）
- **`--docs-open`**：启动后自动打开浏览器
- **`--docs-only`**：只启动文档服务，不启动 class2css 主流程

### 其他

- **`-h, --help`**：显示帮助信息
- **`-v, --version`**：显示版本信息

## 使用示例

### 基本使用

```bash
# 默认配置启动（监听模式）
class2css

# 使用自定义配置文件
class2css -c ./my-config.js

# 单次构建（不监听）
class2css --no-watch
```

### 运行时覆盖

```bash
# 覆盖输入和输出目录
class2css -i ./src -o ./dist

# 覆盖输入、输出和文件名
class2css -i ./pages -o ./styles -f app.wxss

# 覆盖输出类型
class2css -i ./src -o ./dist -t uniFile
```

### 文档服务

```bash
# 启动工具并同时开启文档服务
class2css --docs

# 启动文档服务并自动打开浏览器
class2css --docs --docs-open

# 指定文档服务端口
class2css --docs --docs-port 8080

# 只启动文档服务（不运行主程序）
class2css --docs-only
```

## 注意事项

1. 运行时覆盖的参数会覆盖配置文件中的对应设置
2. 文档服务默认监听 `127.0.0.1`，只能本地访问
3. 如果指定端口被占用，工具会自动寻找下一个可用端口
4. 使用 `--docs-only` 时，不会执行任何 CSS 生成操作

## 下一步

- 了解配置结构与最佳实践：阅读 [配置指南](./config.md)
