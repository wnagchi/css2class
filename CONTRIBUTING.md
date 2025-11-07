# 贡献指南

感谢您对 Class2CSS 项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ✨ 实现新功能

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [文档要求](#文档要求)

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 挑衅、侮辱或贬损的评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他在专业环境中不适当的行为

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请通过 [GitHub Issues](https://github.com/wnagchi/css2class/issues) 提交报告。

**Bug 报告应包含：**

1. **清晰的标题** - 简洁描述问题
2. **环境信息**
   - Node.js 版本
   - 操作系统
   - Class2CSS 版本
3. **重现步骤** - 详细的步骤说明
4. **期望行为** - 您期望发生什么
5. **实际行为** - 实际发生了什么
6. **配置文件** - 相关的配置代码
7. **错误日志** - 完整的错误信息
8. **截图** - 如果适用

**Bug 报告模板：**

```markdown
## Bug 描述
简要描述问题...

## 环境信息
- Node.js 版本: v16.14.0
- 操作系统: Windows 10
- Class2CSS 版本: 2.0.0

## 重现步骤
1. 创建配置文件...
2. 运行命令...
3. 观察到错误...

## 期望行为
应该生成正确的 CSS...

## 实际行为
生成了错误的 CSS...

## 配置文件
\`\`\`javascript
module.exports = {
  // 您的配置
};
\`\`\`

## 错误日志
\`\`\`
错误信息...
\`\`\`

## 截图
如果适用，添加截图帮助说明问题
```

### 提出功能建议

我们欢迎新功能建议！请通过 [GitHub Issues](https://github.com/wnagchi/css2class/issues) 提交。

**功能建议应包含：**

1. **功能描述** - 清晰描述建议的功能
2. **使用场景** - 为什么需要这个功能
3. **预期效果** - 功能应该如何工作
4. **替代方案** - 您考虑过的其他方案
5. **示例代码** - 如果可能，提供示例

**功能建议模板：**

```markdown
## 功能描述
建议添加...功能

## 使用场景
在...情况下，需要...

## 预期效果
用户可以通过...来...

## 替代方案
目前可以通过...实现，但是...

## 示例代码
\`\`\`javascript
// 期望的使用方式
\`\`\`
```

### 改进文档

文档改进同样重要！如果您发现：

- 文档中的错误或不清楚的地方
- 缺失的文档
- 可以改进的示例

请直接提交 Pull Request 或创建 Issue。

## 开发流程

### 1. Fork 项目

点击 GitHub 页面右上角的 "Fork" 按钮，将项目 Fork 到您的账号下。

### 2. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/css2class.git
cd css2class
```

### 3. 创建分支

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 或创建修复分支
git checkout -b fix/your-bug-fix
```

**分支命名规范：**

- `feature/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关
- `chore/` - 构建/工具相关

### 4. 安装依赖

```bash
npm install
```

### 5. 进行开发

在您的分支上进行开发，确保：

- 代码符合项目规范
- 添加必要的测试
- 更新相关文档
- 提交信息清晰明确

### 6. 运行测试

```bash
# 运行测试
npm test

# 运行 linter
npm run lint

# 格式化代码
npm run format
```

### 7. 提交更改

```bash
git add .
git commit -m "feat: 添加新功能描述"
```

### 8. 推送到 GitHub

```bash
git push origin feature/your-feature-name
```

### 9. 创建 Pull Request

1. 访问您 Fork 的仓库页面
2. 点击 "New Pull Request"
3. 填写 PR 描述
4. 等待审核

## 代码规范

### JavaScript 规范

项目使用 ESLint 和 Prettier 进行代码规范检查。

**基本规则：**

```javascript
// ✅ 推荐
class ConfigManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.config = null;
  }

  loadConfig(configPath) {
    // 实现...
  }
}

// ❌ 避免
class configManager {
  constructor(eventBus) {
    this.eventBus = eventBus
    this.config = null
  }
  loadConfig(configPath) {
    // 实现...
  }
}
```

**代码风格：**

- 使用 2 空格缩进
- 使用单引号
- 语句末尾添加分号
- 类名使用 PascalCase
- 函数和变量使用 camelCase
- 常量使用 UPPER_SNAKE_CASE
- 每行最大长度 100 字符

### 注释规范

```javascript
/**
 * 配置管理器
 * 负责加载、验证和管理配置文件
 */
class ConfigManager {
  /**
   * 加载配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {Object} 配置对象
   * @throws {Error} 配置文件不存在或格式错误
   */
  loadConfig(configPath) {
    // 实现...
  }
}
```

### 模块组织

```javascript
// 1. Node.js 内置模块
const path = require('path');
const fs = require('fs');

// 2. 第三方模块
const chokidar = require('chokidar');

// 3. 项目内部模块
const EventBus = require('./core/EventBus');
const Logger = require('./utils/Logger');

// 4. 常量定义
const DEFAULT_CONFIG = {
  // ...
};

// 5. 类或函数定义
class YourClass {
  // ...
}

// 6. 导出
module.exports = YourClass;
```

## 提交规范

### Commit Message 格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型：**

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不影响代码运行）
- `refactor` - 重构（既不是新功能也不是修复）
- `perf` - 性能优化
- `test` - 测试相关
- `chore` - 构建过程或辅助工具的变动

**Scope 范围（可选）：**

- `core` - 核心模块
- `parser` - 解析器
- `generator` - 生成器
- `watcher` - 监听器
- `config` - 配置相关
- `docs` - 文档
- `deps` - 依赖

**示例：**

```bash
# 新功能
git commit -m "feat(parser): 添加 CSS 变量支持"

# Bug 修复
git commit -m "fix(generator): 修复单位转换精度问题"

# 文档更新
git commit -m "docs: 更新配置文档示例"

# 重构
git commit -m "refactor(core): 优化缓存管理器性能"

# 性能优化
git commit -m "perf(parser): 优化正则表达式编译"
```

**详细示例：**

```
feat(parser): 添加 CSS 变量支持

- 实现 CSS 变量解析逻辑
- 添加变量替换功能
- 更新相关测试用例

Closes #123
```

## 测试要求

### 单元测试

所有新功能和 Bug 修复都应该包含相应的测试。

```javascript
// tests/unit/ConfigManager.test.js
const ConfigManager = require('../../src/core/ConfigManager');
const EventBus = require('../../src/core/EventBus');

describe('ConfigManager', () => {
  let eventBus;
  let configManager;

  beforeEach(() => {
    eventBus = new EventBus();
    configManager = new ConfigManager(eventBus);
  });

  describe('loadConfig', () => {
    it('should load valid config file', () => {
      const config = configManager.loadConfig('./test-config.js');
      expect(config).toBeDefined();
      expect(config.system).toBeDefined();
    });

    it('should throw error for invalid config', () => {
      expect(() => {
        configManager.loadConfig('./invalid-config.js');
      }).toThrow();
    });
  });
});
```

### 测试覆盖率

- 新代码的测试覆盖率应达到 80% 以上
- 核心模块的覆盖率应达到 90% 以上

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- ConfigManager.test.js

# 查看覆盖率报告
npm run test:coverage
```

## 文档要求

### 代码文档

- 所有公共 API 必须有 JSDoc 注释
- 复杂逻辑需要添加解释性注释
- 示例代码应该可运行

### README 更新

如果您的更改影响了使用方式，请更新 README.md：

- 添加新功能说明
- 更新使用示例
- 更新配置选项

### CHANGELOG 更新

重要更改需要在 CHANGELOG.md 中记录：

```markdown
## [Unreleased]

### Added
- 新功能描述

### Changed
- 变更说明

### Fixed
- 修复说明
```

## Pull Request 指南

### PR 描述模板

```markdown
## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化

## 变更说明
简要描述此 PR 的目的和实现方式...

## 相关 Issue
Closes #123

## 测试
- [ ] 添加了单元测试
- [ ] 所有测试通过
- [ ] 手动测试通过

## 检查清单
- [ ] 代码符合项目规范
- [ ] 更新了相关文档
- [ ] 添加了必要的注释
- [ ] 没有引入新的警告
- [ ] 向后兼容

## 截图（如适用）
添加截图帮助说明变更...

## 其他说明
其他需要说明的内容...
```

### PR 审核流程

1. **自动检查** - CI/CD 自动运行测试和 linter
2. **代码审核** - 维护者审核代码质量
3. **讨论修改** - 根据反馈进行修改
4. **合并** - 审核通过后合并到主分支

### PR 注意事项

- 保持 PR 专注于单一目的
- 确保 PR 描述清晰完整
- 及时响应审核意见
- 保持提交历史清晰
- 解决所有冲突

## 开发环境设置

### 推荐工具

- **编辑器**: VS Code
- **Node.js**: >= 14.0.0
- **Git**: 最新版本

### VS Code 扩展

推荐安装以下扩展：

- ESLint
- Prettier
- GitLens
- JavaScript (ES6) code snippets

### VS Code 设置

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 获取帮助

如果您在贡献过程中遇到问题：

1. **查看文档** - 阅读项目文档和 README
2. **搜索 Issues** - 查看是否有类似问题
3. **提问** - 在 Issue 中提问
4. **联系维护者** - 通过 GitHub 联系

## 社区

- **GitHub Issues**: [问题讨论](https://github.com/wnagchi/css2class/issues)
- **Pull Requests**: [代码贡献](https://github.com/wnagchi/css2class/pulls)

## 许可证

通过贡献代码，您同意您的贡献将在 [MIT License](LICENSE) 下发布。

---

再次感谢您的贡献！🎉

> 💡 如有任何疑问，欢迎随时提出 Issue 或联系维护者。

