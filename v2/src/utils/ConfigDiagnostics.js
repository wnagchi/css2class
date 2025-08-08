const fs = require('fs');
const path = require('path');

class ConfigDiagnostics {
  constructor(eventBus, configManager) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.diagnosticResults = null;
  }

  // 执行完整诊断
  async runFullDiagnostics() {
    this.eventBus.emit('diagnostics:started', { timestamp: Date.now() });
    
    const results = {
      timestamp: Date.now(),
      overall: { status: 'unknown', score: 0, maxScore: 100 },
      sections: {}
    };

    try {
      // 1. 配置文件诊断
      results.sections.configFile = await this.diagnoseConfigFile();
      
      // 2. 配置内容诊断
      results.sections.configContent = this.diagnoseConfigContent();
      
      // 3. 性能诊断
      results.sections.performance = this.diagnosePerformance();
      
      // 4. 兼容性诊断
      results.sections.compatibility = this.diagnoseCompatibility();
      
      // 5. 最佳实践诊断
      results.sections.bestPractices = this.diagnoseBestPractices();
      
      // 6. 安全性诊断
      results.sections.security = this.diagnoseSecurity();

      // 计算总分
      results.overall = this.calculateOverallScore(results.sections);
      
      this.diagnosticResults = results;
      
      this.eventBus.emit('diagnostics:completed', {
        timestamp: Date.now(),
        score: results.overall.score,
        status: results.overall.status
      });
      
      return results;
    } catch (error) {
      this.eventBus.emit('diagnostics:error', { error: error.message });
      throw error;
    }
  }

  // 诊断配置文件
  async diagnoseConfigFile() {
    const section = {
      title: 'Configuration File',
      status: 'pass',
      score: 0,
      maxScore: 20,
      checks: []
    };

    // 检查主配置文件是否存在
    const configPath = path.join(process.cwd(), 'class2css.config.js');
    const fileExists = fs.existsSync(configPath);
    
    section.checks.push({
      name: 'Config file exists',
      status: fileExists ? 'pass' : 'fail',
      score: fileExists ? 5 : 0,
      maxScore: 5,
      message: fileExists ? 'Configuration file found' : 'class2css.config.js not found',
      suggestion: fileExists ? null : 'Create class2css.config.js file'
    });

    if (fileExists) {
      // 检查文件可读性
      try {
        const stats = fs.statSync(configPath);
        const isReadable = stats.isFile();
        
        section.checks.push({
          name: 'Config file readable',
          status: isReadable ? 'pass' : 'fail',
          score: isReadable ? 5 : 0,
          maxScore: 5,
          message: isReadable ? 'Configuration file is readable' : 'Configuration file is not readable',
          suggestion: isReadable ? null : 'Check file permissions'
        });

        // 检查文件大小
        const fileSizeKB = stats.size / 1024;
        const isSizeReasonable = fileSizeKB < 500; // 500KB限制
        
        section.checks.push({
          name: 'Config file size',
          status: isSizeReasonable ? 'pass' : 'warning',
          score: isSizeReasonable ? 5 : 3,
          maxScore: 5,
          message: `File size: ${fileSizeKB.toFixed(2)}KB`,
          suggestion: isSizeReasonable ? null : 'Consider splitting large configuration into modules'
        });

        // 检查模块化配置文件
        const configsDir = path.join(process.cwd(), 'configs');
        const hasModularConfigs = fs.existsSync(configsDir);
        
        section.checks.push({
          name: 'Modular configs',
          status: hasModularConfigs ? 'pass' : 'info',
          score: hasModularConfigs ? 5 : 3,
          maxScore: 5,
          message: hasModularConfigs ? 'Modular configuration detected' : 'Using monolithic configuration',
          suggestion: hasModularConfigs ? null : 'Consider using modular configuration for better maintainability'
        });

      } catch (error) {
        section.checks.push({
          name: 'Config file access',
          status: 'fail',
          score: 0,
          maxScore: 15,
          message: `Error accessing config file: ${error.message}`,
          suggestion: 'Check file permissions and path'
        });
      }
    }

    section.score = section.checks.reduce((sum, check) => sum + check.score, 0);
    section.status = this.getSectionStatus(section.score, section.maxScore);
    
    return section;
  }

  // 诊断配置内容
  diagnoseConfigContent() {
    const section = {
      title: 'Configuration Content',
      status: 'pass',
      score: 0,
      maxScore: 25,
      checks: []
    };

    if (!this.configManager) {
      section.checks.push({
        name: 'Config manager availability',
        status: 'fail',
        score: 0,
        maxScore: 25,
        message: 'Configuration manager not available',
        suggestion: 'Initialize configuration manager'
      });
      section.status = 'fail';
      return section;
    }

    const config = this.configManager.getConfig();

    // 检查必需的配置项
    const requiredFields = ['output', 'cssName', 'baseClassName'];
    requiredFields.forEach(field => {
      const hasField = config[field] !== undefined;
      section.checks.push({
        name: `Required field: ${field}`,
        status: hasField ? 'pass' : 'fail',
        score: hasField ? 3 : 0,
        maxScore: 3,
        message: hasField ? `${field} is configured` : `${field} is missing`,
        suggestion: hasField ? null : `Add ${field} configuration`
      });
    });

    // 检查系统配置
    const hasSystemConfig = config.system !== undefined;
    section.checks.push({
      name: 'System configuration',
      status: hasSystemConfig ? 'pass' : 'info',
      score: hasSystemConfig ? 4 : 2,
      maxScore: 4,
      message: hasSystemConfig ? 'System configuration found' : 'Using legacy configuration structure',
      suggestion: hasSystemConfig ? null : 'Consider migrating to system configuration'
    });

    // 检查单位配置
    const baseUnit = config.system?.baseUnit || config.baseUnit;
    const unitConversion = config.system?.unitConversion || config.unitConversion;
    
    section.checks.push({
      name: 'Unit configuration',
      status: (baseUnit && unitConversion) ? 'pass' : 'warning',
      score: (baseUnit && unitConversion) ? 3 : 1,
      maxScore: 3,
      message: `Base unit: ${baseUnit || 'undefined'}, Conversion: ${unitConversion || 'undefined'}`,
      suggestion: (baseUnit && unitConversion) ? null : 'Configure baseUnit and unitConversion'
    });

    // 检查CSS类映射
    const cssNameMap = this.configManager.getCssNameMap();
    const hasClasses = cssNameMap && cssNameMap.size > 0;
    
    section.checks.push({
      name: 'CSS class mappings',
      status: hasClasses ? 'pass' : 'fail',
      score: hasClasses ? 5 : 0,
      maxScore: 5,
      message: hasClasses ? `${cssNameMap.size} class mappings found` : 'No CSS class mappings found',
      suggestion: hasClasses ? null : 'Add CSS class mappings to cssName configuration'
    });

    // 检查重要标识配置
    const importantFlags = config.importantFlags;
    const hasImportantFlags = importantFlags && importantFlags.suffix && importantFlags.suffix.length > 0;
    
    section.checks.push({
      name: 'Important flags',
      status: hasImportantFlags ? 'pass' : 'warning',
      score: hasImportantFlags ? 2 : 1,
      maxScore: 2,
      message: hasImportantFlags ? 'Important flags configured' : 'No important flags configured',
      suggestion: hasImportantFlags ? null : 'Consider configuring important flags for !important support'
    });

    section.score = section.checks.reduce((sum, check) => sum + check.score, 0);
    section.status = this.getSectionStatus(section.score, section.maxScore);
    
    return section;
  }

  // 诊断性能
  diagnosePerformance() {
    const section = {
      title: 'Performance',
      status: 'pass',
      score: 0,
      maxScore: 20,
      checks: []
    };

    const config = this.configManager?.getConfig();
    
    // 检查压缩配置
    const compression = config?.system?.compression || config?.compression;
    section.checks.push({
      name: 'CSS compression',
      status: compression ? 'pass' : 'warning',
      score: compression ? 5 : 2,
      maxScore: 5,
      message: compression ? 'CSS compression enabled' : 'CSS compression disabled',
      suggestion: compression ? null : 'Enable compression for better performance'
    });

    // 检查缓存配置
    const cacheConfig = config?.cache;
    section.checks.push({
      name: 'Cache configuration',
      status: cacheConfig ? 'pass' : 'info',
      score: cacheConfig ? 5 : 3,
      maxScore: 5,
      message: cacheConfig ? 'Cache configuration found' : 'Using default cache settings',
      suggestion: cacheConfig ? null : 'Consider configuring cache settings for optimal performance'
    });

    // 检查多文件模式
    const multiFile = config?.multiFile;
    const isMultiFileOptimal = multiFile && multiFile.enabled;
    
    section.checks.push({
      name: 'Multi-file mode',
      status: isMultiFileOptimal ? 'pass' : 'info',
      score: isMultiFileOptimal ? 5 : 3,
      maxScore: 5,
      message: isMultiFileOptimal ? 'Multi-file mode enabled' : 'Single file mode',
      suggestion: isMultiFileOptimal ? null : 'Consider multi-file mode for large projects'
    });

    // 检查CSS类数量
    const cssNameMap = this.configManager?.getCssNameMap();
    const classCount = cssNameMap ? cssNameMap.size : 0;
    const isClassCountReasonable = classCount < 1000;
    
    section.checks.push({
      name: 'CSS class count',
      status: isClassCountReasonable ? 'pass' : 'warning',
      score: isClassCountReasonable ? 5 : 2,
      maxScore: 5,
      message: `${classCount} CSS classes configured`,
      suggestion: isClassCountReasonable ? null : 'Large number of CSS classes may impact performance'
    });

    section.score = section.checks.reduce((sum, check) => sum + check.score, 0);
    section.status = this.getSectionStatus(section.score, section.maxScore);
    
    return section;
  }

  // 诊断兼容性
  diagnoseCompatibility() {
    const section = {
      title: 'Compatibility',
      status: 'pass',
      score: 0,
      maxScore: 15,
      checks: []
    };

    const config = this.configManager?.getConfig();

    // 检查版本兼容性
    const hasLegacyStructure = config && (config.baseUnit || config.unitConversion) && !config.system;
    const hasNewStructure = config && config.system;
    
    let compatibilityStatus = 'unknown';
    let compatibilityScore = 0;
    let compatibilityMessage = '';
    
    if (hasNewStructure && hasLegacyStructure) {
      compatibilityStatus = 'pass';
      compatibilityScore = 5;
      compatibilityMessage = 'Both legacy and new configuration structures detected';
    } else if (hasNewStructure) {
      compatibilityStatus = 'pass';
      compatibilityScore = 5;
      compatibilityMessage = 'Using new configuration structure';
    } else if (hasLegacyStructure) {
      compatibilityStatus = 'warning';
      compatibilityScore = 3;
      compatibilityMessage = 'Using legacy configuration structure';
    } else {
      compatibilityStatus = 'fail';
      compatibilityScore = 0;
      compatibilityMessage = 'No valid configuration structure detected';
    }

    section.checks.push({
      name: 'Configuration structure',
      status: compatibilityStatus,
      score: compatibilityScore,
      maxScore: 5,
      message: compatibilityMessage,
      suggestion: compatibilityStatus === 'warning' ? 'Consider migrating to new configuration structure' : null
    });

    // 检查单位兼容性
    const unitStrategy = config?.system?.unitStrategy;
    section.checks.push({
      name: 'Unit strategy',
      status: unitStrategy ? 'pass' : 'info',
      score: unitStrategy ? 5 : 3,
      maxScore: 5,
      message: unitStrategy ? 'Advanced unit strategy configured' : 'Using basic unit handling',
      suggestion: unitStrategy ? null : 'Configure unit strategy for better unit handling'
    });

    // 检查变体支持
    const variants = config?.variants;
    section.checks.push({
      name: 'Variant support',
      status: variants ? 'pass' : 'info',
      score: variants ? 5 : 3,
      maxScore: 5,
      message: variants ? 'Variant configuration found' : 'No variant configuration',
      suggestion: variants ? null : 'Configure variants for responsive and pseudo-class support'
    });

    section.score = section.checks.reduce((sum, check) => sum + check.score, 0);
    section.status = this.getSectionStatus(section.score, section.maxScore);
    
    return section;
  }

  // 诊断最佳实践
  diagnoseBestPractices() {
    const section = {
      title: 'Best Practices',
      status: 'pass',
      score: 0,
      maxScore: 15,
      checks: []
    };

    const config = this.configManager?.getConfig();

    // 检查配置组织
    const hasSystemSection = config?.system;
    section.checks.push({
      name: 'Configuration organization',
      status: hasSystemSection ? 'pass' : 'warning',
      score: hasSystemSection ? 5 : 2,
      maxScore: 5,
      message: hasSystemSection ? 'Well-organized configuration structure' : 'Configuration could be better organized',
      suggestion: hasSystemSection ? null : 'Use system section for better configuration organization'
    });

    // 检查命名约定
    const cssNameMap = this.configManager?.getCssNameMap();
    let namingScore = 0;
    let namingMessage = '';
    
    if (cssNameMap && cssNameMap.size > 0) {
      const classNames = Array.from(cssNameMap.keys());
      const hasConsistentNaming = classNames.every(name => /^[a-z]+(-[a-z]+)*$/.test(name));
      
      if (hasConsistentNaming) {
        namingScore = 5;
        namingMessage = 'Consistent kebab-case naming detected';
      } else {
        namingScore = 3;
        namingMessage = 'Inconsistent naming convention detected';
      }
    } else {
      namingScore = 0;
      namingMessage = 'No CSS classes to analyze';
    }

    section.checks.push({
      name: 'Naming convention',
      status: namingScore >= 4 ? 'pass' : namingScore >= 2 ? 'warning' : 'fail',
      score: namingScore,
      maxScore: 5,
      message: namingMessage,
      suggestion: namingScore >= 4 ? null : 'Use consistent kebab-case naming for CSS classes'
    });

    // 检查文档化
    const hasComments = this.checkConfigComments();
    section.checks.push({
      name: 'Configuration documentation',
      status: hasComments ? 'pass' : 'info',
      score: hasComments ? 5 : 3,
      maxScore: 5,
      message: hasComments ? 'Configuration includes comments' : 'Configuration lacks documentation',
      suggestion: hasComments ? null : 'Add comments to explain configuration sections'
    });

    section.score = section.checks.reduce((sum, check) => sum + check.score, 0);
    section.status = this.getSectionStatus(section.score, section.maxScore);
    
    return section;
  }

  // 诊断安全性
  diagnoseSecurity() {
    const section = {
      title: 'Security',
      status: 'pass',
      score: 0,
      maxScore: 5,
      checks: []
    };

    // 检查输出路径安全性
    const config = this.configManager?.getConfig();
    const outputPath = config?.output?.path;
    
    let pathSecurity = 'unknown';
    let pathScore = 0;
    let pathMessage = '';
    
    if (outputPath) {
      const hasTraversal = outputPath.includes('..') || outputPath.includes('~');
      if (hasTraversal) {
        pathSecurity = 'warning';
        pathScore = 2;
        pathMessage = 'Output path contains potentially unsafe traversal';
      } else {
        pathSecurity = 'pass';
        pathScore = 5;
        pathMessage = 'Output path appears secure';
      }
    } else {
      pathSecurity = 'fail';
      pathScore = 0;
      pathMessage = 'No output path configured';
    }

    section.checks.push({
      name: 'Output path security',
      status: pathSecurity,
      score: pathScore,
      maxScore: 5,
      message: pathMessage,
      suggestion: pathSecurity === 'warning' ? 'Avoid path traversal in output configuration' : 
                  pathSecurity === 'fail' ? 'Configure output path' : null
    });

    section.score = section.checks.reduce((sum, check) => sum + check.score, 0);
    section.status = this.getSectionStatus(section.score, section.maxScore);
    
    return section;
  }

  // 计算总分
  calculateOverallScore(sections) {
    const totalScore = Object.values(sections).reduce((sum, section) => sum + section.score, 0);
    const maxScore = Object.values(sections).reduce((sum, section) => sum + section.maxScore, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    let status = 'fail';
    if (percentage >= 90) status = 'excellent';
    else if (percentage >= 80) status = 'good';
    else if (percentage >= 70) status = 'pass';
    else if (percentage >= 50) status = 'warning';
    
    return {
      status,
      score: totalScore,
      maxScore,
      percentage
    };
  }

  // 获取区块状态
  getSectionStatus(score, maxScore) {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'pass';
    if (percentage >= 50) return 'warning';
    return 'fail';
  }

  // 检查配置文件是否有注释
  checkConfigComments() {
    try {
      const configPath = path.join(process.cwd(), 'class2css.config.js');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return content.includes('//') || content.includes('/*');
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  // 生成优化建议
  generateOptimizationSuggestions() {
    if (!this.diagnosticResults) {
      return {
        error: 'No diagnostic results available. Run diagnostics first.'
      };
    }

    const suggestions = {
      high: [],
      medium: [],
      low: []
    };

    Object.values(this.diagnosticResults.sections).forEach(section => {
      section.checks.forEach(check => {
        if (check.suggestion) {
          const priority = check.status === 'fail' ? 'high' : 
                          check.status === 'warning' ? 'medium' : 'low';
          
          suggestions[priority].push({
            section: section.title,
            check: check.name,
            suggestion: check.suggestion,
            impact: check.maxScore
          });
        }
      });
    });

    return suggestions;
  }

  // 生成报告
  generateReport(format = 'text') {
    if (!this.diagnosticResults) {
      return 'No diagnostic results available. Run diagnostics first.';
    }

    if (format === 'json') {
      return JSON.stringify(this.diagnosticResults, null, 2);
    }

    // 文本格式报告
    let report = '';
    report += '='.repeat(60) + '\n';
    report += 'CLASS2CSS CONFIGURATION DIAGNOSTICS REPORT\n';
    report += '='.repeat(60) + '\n';
    report += `Generated: ${new Date(this.diagnosticResults.timestamp).toLocaleString()}\n`;
    report += `Overall Score: ${this.diagnosticResults.overall.score}/${this.diagnosticResults.overall.maxScore} (${this.diagnosticResults.overall.percentage}%)\n`;
    report += `Status: ${this.diagnosticResults.overall.status.toUpperCase()}\n\n`;

    Object.values(this.diagnosticResults.sections).forEach(section => {
      report += `-`.repeat(40) + '\n';
      report += `${section.title}: ${section.score}/${section.maxScore} [${section.status.toUpperCase()}]\n`;
      report += `-`.repeat(40) + '\n';
      
      section.checks.forEach(check => {
        const status = check.status.toUpperCase().padEnd(8);
        report += `[${status}] ${check.name}: ${check.message}\n`;
        if (check.suggestion) {
          report += `           → ${check.suggestion}\n`;
        }
      });
      report += '\n';
    });

    const suggestions = this.generateOptimizationSuggestions();
    if (suggestions.high.length > 0 || suggestions.medium.length > 0) {
      report += '='.repeat(60) + '\n';
      report += 'OPTIMIZATION SUGGESTIONS\n';
      report += '='.repeat(60) + '\n';
      
      if (suggestions.high.length > 0) {
        report += 'HIGH PRIORITY:\n';
        suggestions.high.forEach(s => {
          report += `• ${s.suggestion} (${s.section}: ${s.check})\n`;
        });
        report += '\n';
      }
      
      if (suggestions.medium.length > 0) {
        report += 'MEDIUM PRIORITY:\n';
        suggestions.medium.forEach(s => {
          report += `• ${s.suggestion} (${s.section}: ${s.check})\n`;
        });
        report += '\n';
      }
    }

    return report;
  }

  // 获取最新诊断结果
  getLatestResults() {
    return this.diagnosticResults;
  }
}

module.exports = ConfigDiagnostics;