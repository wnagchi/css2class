const path = require('path');

class ConfigValidator {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.errors = [];
    this.warnings = [];
  }

  // 验证完整配置
  validateConfig(config) {
    this.errors = [];
    this.warnings = [];

    // 基础配置验证
    this.validateSystemConfig(config);
    
    // 原子化规则验证
    this.validateAtomicRules(config);
    
    // 兼容性配置验证
    this.validateCompatibilityConfig(config);
    
    // 冲突检测
    this.detectConflicts(config);
    
    // 单位一致性检查
    this.checkUnitConsistency(config);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  // 验证系统配置
  validateSystemConfig(config) {
    const system = config.system || {};
    
    // 检查必需字段
    if (!system.baseUnit) {
      this.errors.push('system.baseUnit is required');
    }
    
    if (typeof system.unitConversion !== 'number' && typeof system.unitConversion !== 'string') {
      this.errors.push('system.unitConversion must be a number or string');
    }
    
    // 验证单位转换比例
    const conversion = parseFloat(system.unitConversion);
    if (isNaN(conversion) || conversion <= 0) {
      this.errors.push('system.unitConversion must be a positive number');
    }
    
    // 验证压缩设置
    if (typeof system.compression !== 'boolean') {
      this.warnings.push('system.compression should be a boolean, defaulting to true');
    }
  }

  // 验证原子化规则
  validateAtomicRules(config) {
    const atomicRules = config.atomicRules || {};
    
    // 检查是否至少有一个规则类别
    const ruleCategories = Object.keys(atomicRules);
    if (ruleCategories.length === 0) {
      this.warnings.push('No atomic rules defined, using legacy configuration');
      return;
    }
    
    // 验证每个规则类别
    ruleCategories.forEach(category => {
      this.validateRuleCategory(category, atomicRules[category]);
    });
  }

  // 验证规则类别
  validateRuleCategory(categoryName, categoryRules) {
    if (typeof categoryRules !== 'object') {
      this.errors.push(`atomicRules.${categoryName} must be an object`);
      return;
    }
    
    Object.entries(categoryRules).forEach(([ruleName, ruleConfig]) => {
      this.validateRule(ruleName, ruleConfig, categoryName);
    });
  }

  // 验证单个规则
  validateRule(ruleName, ruleConfig, categoryName) {
    if (typeof ruleConfig !== 'object') {
      this.errors.push(`atomicRules.${categoryName}.${ruleName} must be an object`);
      return;
    }
    
    // 检查必需字段
    if (!ruleConfig.properties) {
      this.errors.push(`atomicRules.${categoryName}.${ruleName} must have properties field`);
      return;
    }
    
    // 验证properties字段
    if (!Array.isArray(ruleConfig.properties) && typeof ruleConfig.properties !== 'string') {
      this.errors.push(`atomicRules.${categoryName}.${ruleName}.properties must be string or array`);
      return;
    }
    
    // 验证defaultUnit
    if (ruleConfig.defaultUnit !== undefined && typeof ruleConfig.defaultUnit !== 'string') {
      this.errors.push(`atomicRules.${categoryName}.${ruleName}.defaultUnit must be a string`);
    }
    
    // 验证value字段（用于固定值）
    if (ruleConfig.value !== undefined && typeof ruleConfig.value !== 'string' && typeof ruleConfig.value !== 'number') {
      this.errors.push(`atomicRules.${categoryName}.${ruleName}.value must be string or number`);
    }
  }

  // 验证兼容性配置
  validateCompatibilityConfig(config) {
    const compatibility = config.compatibility || {};
    
    // 验证legacy配置
    if (compatibility.legacy) {
      this.validateLegacyConfig(compatibility.legacy);
    }
    
    // 验证unified配置
    if (compatibility.unified) {
      if (typeof compatibility.unified.enabled !== 'boolean') {
        this.warnings.push('compatibility.unified.enabled should be a boolean');
      }
    }
  }

  // 验证legacy配置
  validateLegacyConfig(legacy) {
    // 验证cssName
    if (legacy.cssName && typeof legacy.cssName !== 'object') {
      this.errors.push('compatibility.legacy.cssName must be an object');
    }
    
    // 验证baseClassName
    if (legacy.baseClassName && typeof legacy.baseClassName !== 'object') {
      this.errors.push('compatibility.legacy.baseClassName must be an object');
    }
    
    // 验证atomicClassMap
    if (legacy.atomicClassMap && typeof legacy.atomicClassMap !== 'object') {
      this.errors.push('compatibility.legacy.atomicClassMap must be an object');
    }
  }

  // 检测配置冲突
  detectConflicts(config) {
    const conflicts = [];
    
    // 检测text属性冲突
    const textConflicts = this.detectTextConflicts(config);
    conflicts.push(...textConflicts);
    
    // 检测重复定义
    const duplicateConflicts = this.detectDuplicateDefinitions(config);
    conflicts.push(...duplicateConflicts);
    
    // 报告冲突
    conflicts.forEach(conflict => {
      this.warnings.push(`Configuration conflict detected: ${conflict}`);
    });
  }

  // 检测text属性冲突
  detectTextConflicts(config) {
    const conflicts = [];
    
    // 检查cssName中的text定义
    const cssNameText = config.cssName?.text;
    const atomicClassMapText = config.atomicClassMap?.text;
    
    if (cssNameText && atomicClassMapText) {
      conflicts.push('text property defined in both cssName and atomicClassMap');
    }
    
    return conflicts;
  }

  // 检测重复定义
  detectDuplicateDefinitions(config) {
    const conflicts = [];
    const allDefinitions = new Set();
    
    // 收集所有定义
    const collectDefinitions = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (allDefinitions.has(fullKey)) {
          conflicts.push(`Duplicate definition: ${fullKey}`);
        } else {
          allDefinitions.add(fullKey);
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          collectDefinitions(obj[key], fullKey);
        }
      });
    };
    
    // 检查各个配置段
    collectDefinitions(config.cssName, 'cssName');
    collectDefinitions(config.baseClassName, 'baseClassName');
    collectDefinitions(config.atomicClassMap, 'atomicClassMap');
    collectDefinitions(config.atomicRules, 'atomicRules');
    
    return conflicts;
  }

  // 检查单位一致性
  checkUnitConsistency(config) {
    const inconsistencies = [];
    
    // 检查基础单位设置
    const baseUnit = config.system?.baseUnit || config.baseUnit;
    if (!baseUnit) {
      this.warnings.push('No base unit specified, defaulting to px');
      return;
    }
    
    // 检查atomicClassMap中的单位一致性
    const atomicClassMap = config.atomicClassMap || {};
    Object.entries(atomicClassMap).forEach(([key, value]) => {
      if (value && typeof value === 'object' && value.unit) {
        // 检查是否与基础单位一致
        if (value.unit !== baseUnit && value.unit !== '') {
          this.warnings.push(`Unit inconsistency: ${key} uses ${value.unit} instead of ${baseUnit}`);
        }
      }
    });
    
    return inconsistencies;
  }

  // 自动修复配置
  autoFix(config) {
    const fixedConfig = JSON.parse(JSON.stringify(config));
    let fixed = false;
    
    // 修复缺失的默认值
    if (!fixedConfig.system) {
      fixedConfig.system = {};
      fixed = true;
    }
    
    if (!fixedConfig.system.baseUnit) {
      fixedConfig.system.baseUnit = 'px';
      fixed = true;
    }
    
    if (fixedConfig.system.unitConversion === undefined) {
      fixedConfig.system.unitConversion = 1;
      fixed = true;
    }
    
    if (fixedConfig.system.compression === undefined) {
      fixedConfig.system.compression = true;
      fixed = true;
    }
    
    // 修复配置冲突
    if (this.resolveConflicts(fixedConfig)) {
      fixed = true;
    }
    
    return { config: fixedConfig, fixed };
  }

  // 解决配置冲突
  resolveConflicts(config) {
    let resolved = false;
    
    // 解决text属性冲突
    if (config.cssName?.text && config.atomicClassMap?.text) {
      // 保留atomicClassMap中的定义，移除cssName中的
      delete config.cssName.text;
      resolved = true;
    }
    
    return resolved;
  }

  // 生成配置报告
  generateReport(config) {
    const validation = this.validateConfig(config);
    const autoFix = this.autoFix(config);
    
    return {
      validation,
      autoFix,
      recommendations: this.generateRecommendations(config),
      summary: {
        totalErrors: validation.errors.length,
        totalWarnings: validation.warnings.length,
        needsAutoFix: autoFix.fixed,
        overallStatus: validation.isValid ? 'valid' : 'invalid'
      }
    };
  }

  // 生成优化建议
  generateRecommendations(config) {
    const recommendations = [];
    
    // 检查是否使用了新的配置结构
    if (!config.atomicRules) {
      recommendations.push('Consider migrating to the new atomicRules structure for better organization');
    }
    
    // 检查单位一致性
    if (config.atomicClassMap) {
      const baseUnit = config.system?.baseUnit || config.baseUnit;
      Object.entries(config.atomicClassMap).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.unit && value.unit !== baseUnit) {
          recommendations.push(`Consider using consistent units: ${key} should use ${baseUnit}`);
        }
      });
    }
    
    // 检查是否启用了验证
    if (!config.validation) {
      recommendations.push('Enable configuration validation for better error detection');
    }
    
    return recommendations;
  }
}

module.exports = ConfigValidator; 