# 配置迁移指南

本指南帮助您从旧版本的 Class2CSS 配置迁移到新的优化版本。

## 🔄 迁移概览

### 版本兼容性

- ✅ **完全向后兼容**: 旧版配置继续正常工作
- 🆕 **新功能**: 通过新配置格式解锁高级特性
- 🚀 **性能提升**: 新配置带来显著的性能改进

## 📋 迁移检查清单

### 1. 基础配置迁移

#### 旧版配置
```javascript
module.exports = {
  baseUnit: "rpx",
  unitConversion: 2,
  output: {
    path: "../dist",
    fileName: "styles.wxss"
  },
  cssName: {
    "m": { classArr: ["margin"], unit: "rpx" }
  },
  baseClassName: {
    "container": "max-width: 1200rpx; margin: 0 auto;"
  }
};
```

#### 新版配置（推荐）
```javascript
module.exports = {
  // ========== 新增系统配置 ==========
  system: {
    baseUnit: "rpx",
    unitConversion: 2,
    compression: true,                    // 🆕 CSS压缩
    unitStrategy: {                       // 🆕 智能单位策略
      autoDetect: true,
      propertyUnits: {
        'font-size': 'rpx',
        'width|height': 'rpx',
        'opacity': '',
        'z-index': ''
      }
    }
  },
  
  // ========== 原有配置保持不变 ==========
  output: {
    path: "../dist",
    fileName: "styles.wxss"
  },
  cssName: {
    "m": { classArr: ["margin"], unit: "rpx" }
  },
  baseClassName: {
    "container": "max-width: 1200rpx; margin: 0 auto;"
  }
};
```

### 2. 逐步迁移策略

#### 阶段 1: 保持现有配置（0 风险）
```javascript
// 继续使用旧配置，工具自动兼容
module.exports = {
  baseUnit: "rpx",           // 自动映射到 system.baseUnit
  unitConversion: 2,         // 自动映射到 system.unitConversion
  output: { /* ... */ },
  cssName: { /* ... */ },
  baseClassName: { /* ... */ }
};
```

#### 阶段 2: 启用基础新功能
```javascript
module.exports = {
  // 添加基础系统配置
  system: {
    baseUnit: "rpx",
    unitConversion: 2,
    compression: true          // 🆕 启用CSS压缩
  },
  
  // 保持原有配置
  output: { /* ... */ },
  cssName: { /* ... */ },
  baseClassName: { /* ... */ }
};
```

#### 阶段 3: 完整新配置
```javascript
module.exports = {
  system: {
    baseUnit: "rpx",
    unitConversion: 2,
    compression: true,
    unitStrategy: {            // 🆕 智能单位策略
      autoDetect: true,
      propertyUnits: {
        'font-size': 'rpx',
        'width|height': 'rpx',
        'opacity': '',
        'z-index': ''
      }
    }
  },
  output: { /* ... */ },
  cssName: { /* ... */ },
  baseClassName: { /* ... */ }
};
```

## 🆕 新功能启用

### 1. 智能单位处理

```javascript
system: {
  unitStrategy: {
    autoDetect: true,  // 自动检测单位
    propertyUnits: {
      // 为特定属性配置默认单位
      'font-size': 'rpx',
      'width|height': 'rpx',
      'opacity': '',           // 无单位
      'z-index': '',          // 无单位
      'line-height': '',      // 可以无单位
      'border-radius': 'rpx'
    }
  }
}
```

**效果对比**:
```html
<!-- 旧版本 -->
<view class="text-14">        <!-- font-size: 28rpx; -->

<!-- 新版本（智能处理） -->
<view class="text-14">        <!-- font-size: 28rpx; -->
<view class="text-14px">      <!-- font-size: 14px; (保持原单位) -->
<view class="opacity-05">     <!-- opacity: 0.5; (自动无单位) -->
```

### 2. 配置压缩

```javascript
system: {
  compression: true  // 启用CSS压缩
}
```

### 3. 缓存优化

```javascript
system: {
  cache: {
    enableFileCache: true,
    enableCssGenerationCache: true,
    maxCssGenerationCacheSize: 5000
  }
}
```

## 🔧 配置模块化

### 拆分大型配置

#### 创建模块化配置文件

```javascript
// configs/spacing.config.js
module.exports = {
  margin: {
    "m": { classArr: ["margin"], unit: "rpx" },
    "mt": { classArr: ["margin-top"], unit: "rpx" },
    "mr": { classArr: ["margin-right"], unit: "rpx" },
    "mb": { classArr: ["margin-bottom"], unit: "rpx" },
    "ml": { classArr: ["margin-left"], unit: "rpx" }
  },
  padding: {
    "p": { classArr: ["padding"], unit: "rpx" },
    "pt": { classArr: ["padding-top"], unit: "rpx" },
    "pr": { classArr: ["padding-right"], unit: "rpx" },
    "pb": { classArr: ["padding-bottom"], unit: "rpx" },
    "pl": { classArr: ["padding-left"], unit: "rpx" }
  }
};

// configs/typography.config.js
module.exports = {
  fontSize: {
    "text": { classArr: ["font-size"], unit: "rpx" }
  },
  fontWeight: {
    "font-thin": { classArr: ["font-weight"], unit: "-", value: "100" },
    "font-normal": { classArr: ["font-weight"], unit: "-", value: "400" },
    "font-bold": { classArr: ["font-weight"], unit: "-", value: "700" }
  }
};

// configs/colors.config.js
module.exports = {
  baseColors: {
    primary: "#007bff",
    secondary: "#6c757d",
    success: "#28a745",
    danger: "#dc3545"
  },
  colorClasses: {
    "text-primary": { classArr: ["color"], unit: "-", value: "#007bff" },
    "bg-primary": { classArr: ["background-color"], unit: "-", value: "#007bff" }
  }
};
```

#### 在主配置中引用

```javascript
// class2css.config.js
const spacing = require('./configs/spacing.config');
const typography = require('./configs/typography.config');
const colors = require('./configs/colors.config');

module.exports = {
  system: {
    baseUnit: "rpx",
    unitConversion: 2,
    compression: true
  },
  
  output: {
    path: "../dist",
    fileName: "styles.wxss"
  },
  
  cssName: {
    ...spacing.margin,
    ...spacing.padding,
    ...typography.fontSize,
    ...colors.colorClasses
  },
  
  baseClassName: {
    "container": "max-width: 1200rpx; margin: 0 auto;",
    "flex": "display: flex;",
    "flex-center": "display: flex; justify-content: center; align-items: center;"
  }
};
```

## 🛠️ 自动迁移工具

### 使用内置迁移工具

```javascript
const { CompatibilityAdapter } = require('class2css');

// 读取旧配置
const oldConfig = require('./class2css.config.js');

// 创建适配器
const adapter = new CompatibilityAdapter(eventBus);

// 自动迁移到新格式
const migratedConfig = adapter.migrateToNewFormat(oldConfig);

// 生成迁移报告
const report = adapter.generateMigrationReport(oldConfig, migratedConfig);
console.log(report);

// 保存新配置
const fs = require('fs');
fs.writeFileSync(
  'class2css.config.new.js', 
  `module.exports = ${JSON.stringify(migratedConfig, null, 2)};`
);
```

### 配置验证

```javascript
const { ConfigValidator } = require('class2css');

const validator = new ConfigValidator(eventBus);
const result = validator.validateConfig(migratedConfig);

if (!result.isValid) {
  console.log('迁移后配置存在问题:');
  result.errors.forEach(error => console.log('❌', error));
  result.warnings.forEach(warning => console.log('⚠️', warning));
  
  // 自动修复
  const fixedConfig = validator.autoFix(migratedConfig);
  console.log('✅ 已自动修复配置问题');
}
```

## 📊 配置诊断

### 运行配置诊断

```javascript
const { ConfigDiagnostics } = require('class2css');

const diagnostics = new ConfigDiagnostics(eventBus, configManager);
const results = await diagnostics.runFullDiagnostics();

// 生成诊断报告
console.log(diagnostics.generateReport());

// 获取优化建议
const suggestions = diagnostics.generateOptimizationSuggestions();
suggestions.high.forEach(s => console.log('🔴 高优先级:', s.suggestion));
suggestions.medium.forEach(s => console.log('🟡 中优先级:', s.suggestion));
```

## ⚠️ 迁移注意事项

### 1. 配置冲突处理

迁移后可能出现的冲突：

```javascript
// 可能的冲突示例
cssName: {
  "text": { classArr: ["font-size"], unit: "rpx" },
  "font": { classArr: ["font-size"], unit: "rpx" }  // ❌ 冲突
}
```

**解决方案**:
```javascript
// 使用配置验证器自动检测和修复
const validator = new ConfigValidator(eventBus);
const fixedConfig = validator.autoFix(config);
```

### 2. 性能注意事项

- **启用缓存**: 新版本默认启用多种缓存机制
- **压缩CSS**: 建议在生产环境启用
- **增量更新**: 自动启用，提升大项目性能

### 3. 向后兼容性保证

- ✅ 旧版配置继续工作
- ✅ API 调用保持兼容
- ✅ 生成的CSS格式不变
- ✅ 类名使用方式不变

## 🔍 迁移验证

### 1. 功能验证

```bash
# 运行工具确保基本功能正常
npm run start

# 检查生成的CSS是否符合预期
diff old_styles.css new_styles.css
```

### 2. 性能对比

```javascript
// 迁移前后性能对比
const stats = cacheManager.getCacheStats();
console.log('缓存命中率:', stats.cssGeneration.hitRate);
console.log('内存使用:', stats.memoryUsage);
```

### 3. 配置健康检查

```javascript
// 运行完整诊断
const diagnostics = new ConfigDiagnostics(eventBus, configManager);
const results = await diagnostics.runFullDiagnostics();
console.log('配置健康分数:', results.overall.percentage);
```

## 📞 获取帮助

如果在迁移过程中遇到问题：

1. **查看诊断报告**: 运行配置诊断获取详细信息
2. **使用自动修复**: 尝试配置验证器的自动修复功能
3. **查看日志**: 检查工具输出的详细日志
4. **提交 Issue**: 在 GitHub 上反馈问题

---

> 💡 迁移建议：先在测试环境验证，确认无误后再应用到生产环境。