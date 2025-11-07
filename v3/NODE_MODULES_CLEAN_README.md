# Node_modules 清理工具

这个工具包包含了多个脚本来递归查找和删除指定目录下的所有 `node_modules` 文件夹。

## 📁 脚本文件说明

| 脚本文件 | 适用平台 | 特点 | 推荐度 |
|---------|---------|------|--------|
| `clean-node-modules.js` | 跨平台 (Node.js) | 功能最全面，支持试运行、大小限制等 | ⭐⭐⭐⭐⭐ |
| `clean-node-modules.ps1` | Windows PowerShell | 功能丰富，PowerShell环境 | ⭐⭐⭐⭐ |
| `clean-node-modules.bat` | Windows CMD | 简单直接，无需额外依赖 | ⭐⭐⭐ |

## 🚀 快速开始

### 方式1: Node.js 版本 (推荐)

```bash
# 试运行查看将要删除的内容
node clean-node-modules.js --dry-run

# 强制删除当前目录下的所有 node_modules
node clean-node-modules.js --force

# 删除指定目录，限制最大大小为 500MB
node clean-node-modules.js --max-size 500MB /path/to/projects
```

### 方式2: PowerShell 版本 (Windows)

```powershell
# 试运行
.\clean-node-modules.ps1 -DryRun

# 强制删除
.\clean-node-modules.ps1 -Force

# 带详细输出
.\clean-node-modules.ps1 -Verbose -Force
```

### 方式3: 批处理版本 (Windows)

```cmd
# 交互式删除
clean-node-modules.bat

# 删除指定目录
clean-node-modules.bat "D:\projects"
```

## 📖 详细使用说明

### Node.js 版本 (clean-node-modules.js)

**基本用法:**
```bash
node clean-node-modules.js [选项] [目录路径]
```

**选项参数:**
- `--dry-run, -d`: 试运行模式，只显示不删除
- `--force, -f`: 强制删除，不询问确认
- `--verbose, -v`: 详细输出
- `--max-size SIZE`: 设置最大删除大小限制
- `--help, -h`: 显示帮助信息

**大小格式示例:**
- `500MB` - 500兆字节
- `1GB` - 1吉字节
- `2.5GB` - 2.5吉字节

**使用示例:**
```bash
# 基本使用
node clean-node-modules.js ./

# 试运行模式
node clean-node-modules.js --dry-run ./projects

# 强制删除所有
node clean-node-modules.js --force ./workspace

# 限制大小
node clean-node-modules.js --max-size 1GB ./projects

# 详细输出
node clean-node-modules.js --verbose --force ./
```

### PowerShell 版本 (clean-node-modules.ps1)

**基本用法:**
```powershell
.\clean-node-modules.ps1 [参数] [目录路径]
```

**参数说明:**
- `-DryRun`: 试运行模式
- `-Force`: 强制删除
- `-Verbose`: 详细输出
- `-MaxSize SIZE`: 最大大小限制

**使用示例:**
```powershell
# 基本使用
.\clean-node-modules.ps1

# 试运行
.\clean-node-modules.ps1 -DryRun

# 强制删除指定目录
.\clean-node-modules.ps1 -Force "C:\projects"

# 大小限制
.\clean-node-modules.ps1 -MaxSize "500MB" -Force
```

### 批处理版本 (clean-node-modules.bat)

**使用方法:**
```cmd
clean-node-modules.bat [目录路径]
```

**特点:**
- 简单直接，无需参数
- 自动询问确认
- 显示删除进度和统计

**使用示例:**
```cmd
# 删除当前目录
clean-node-modules.bat

# 删除指定目录
clean-node-modules.bat "D:\projects"
```

## ⚡ 高级功能

### 大小限制

设置最大删除大小，避免误删大型项目：

```bash
# 只删除小于 500MB 的 node_modules
node clean-node-modules.js --max-size 500MB ./projects
```

### 试运行模式

在实际删除前预览将要删除的内容：

```bash
node clean-node-modules.js --dry-run --verbose ./projects
```

### 强制模式

跳过所有确认提示，适合自动化脚本：

```bash
node clean-node-modules.js --force ./projects
```

## 📊 输出示例

### Node.js 版本输出:
```
🔍 开始扫描 node_modules 文件夹...

📁 目标路径: /Users/user/projects
🔧 模式: 实际删除
⚡ 强力模式: 是

📦 发现: /Users/user/projects/project1/node_modules (245.67 MB)
🗑️  正在删除: /Users/user/projects/project1/node_modules...
✅ 删除成功: /Users/user/projects/project1/node_modules (释放 245.67 MB)

📦 发现: /Users/user/projects/project2/node_modules (123.45 MB)
🗑️  正在删除: /Users/user/projects/project2/node_modules...
✅ 删除成功: /Users/user/projects/project2/node_modules (释放 123.45 MB)

📊 扫完成绩统计:

✅ 发现数量: 2
✅ 删除成功: 2
❌ 删除失败: 0
⚠️  跳过数量: 0
💾 释放空间: 369.12 MB
⏱️  执行时间: 12.34s

🎉 清理完成！
```

## 🛡️ 安全注意事项

1. **备份重要数据**: 在删除前确保重要数据已备份
2. **试运行**: 建议先使用 `--dry-run` 参数查看将要删除的内容
3. **权限检查**: 确保对目标目录有足够的权限
4. **大小限制**: 对重要项目使用大小限制保护
5. **确认列表**: 检查将要删除的文件夹列表

## 🔧 故障排除

### 常见问题

1. **权限不足**: 使用管理员权限运行脚本
2. **文件夹被占用**: 关闭相关IDE或程序后重试
3. **路径包含空格**: 确保路径正确引用
4. **杀毒软件拦截**: 暂时禁用杀毒软件的实时保护

### 错误代码

- `退出码 0`: 清理成功
- `退出码 1`: 清理失败或部分失败

## 💡 最佳实践

1. **定期清理**: 建议定期清理不需要的 node_modules
2. **项目分离**: 将项目按用途分类，避免误删
3. **版本控制**: 使用 `.gitignore` 忽略 node_modules
4. **自动化**: 在 CI/CD 流程中集成清理步骤

## 📝 自定义配置

你可以根据需要修改脚本中的以下配置：

- 跳过的文件夹列表
- 默认确认行为
- 输出格式和颜色
- 大小计算方式

---

**注意**: 使用这些脚本删除的文件将无法恢复，请确保你真的不需要这些文件！