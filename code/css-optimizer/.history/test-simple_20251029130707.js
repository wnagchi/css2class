#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 简化的CSS优化器测试版本
 */
class SimpleCSSOptimizer {
  constructor() {
    this.config = {
      colors: {
        customColors: {
          primary: '#1890ff',
          success: '#52c41a',
          warning: '#faad14',
          error: '#ff4d4f',
          headerblue: '#1e90ff'
        }
      },
      units: {
        spacing: {
          defaultUnit: 'px',
          conversions: {
            px: 1,
            rpx: 2
          }
        }
      },
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px'
      }
    };
  }

  /**
   * 解析CSS类名
   */
  parseCSSClasses(content) {
    const classRegex = /class\s*=\s*["']([^"']+)["']/g;
    const classes = new Set();
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const classNames = match[1].split(/\s+/);
      classNames.forEach(className => {
        if (className.trim()) {
          classes.add(className.trim());
        }
      });
    }

    return classes;
  }

  /**
   * 生成颜色CSS规则
   */
  generateColorRule(className) {
    // 匹配 bg-colorName 或 text-colorName
    const colorMatch = className.match(/^(bg|text|border)-(.+)$/);
    if (!colorMatch) return null;

    const [, property, colorValue] = colorMatch;
    
    // 检查是否为自定义颜色
    if (this.config.colors.customColors[colorValue]) {
      const color = this.config.colors.customColors[colorValue];
      const cssProperty = property === 'bg' ? 'background-color' : 
                         property === 'text' ? 'color' : 'border-color';
      return `.${className} { ${cssProperty}: ${color}; }`;
    }

    // 检查是否为十六进制颜色
    const hexMatch = colorValue.match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hexMatch) {
      const color = `#${colorValue}`;
      const cssProperty = property === 'bg' ? 'background-color' : 
                         property === 'text' ? 'color' : 'border-color';
      return `.${className} { ${cssProperty}: ${color}; }`;
    }

    return null;
  }

  /**
   * 生成间距CSS规则
   */
  generateSpacingRule(className) {
    // 匹配 m-{property}-{value}, p-{property}-{value}, mx, my等
    const spacingMatch = className.match(/^([mp][xytrbl]?)-(\d+)$/);
    if (!spacingMatch) return null;

    const [, shorthand, value] = spacingMatch;
    const unit = this.config.units.spacing.defaultUnit;
    const convertedValue = parseInt(value) * this.config.units.spacing.conversions[unit];

    let cssProperty = '';
    let cssValue = `${convertedValue}${unit}`;

    // 解析简写属性
    if (shorthand.length === 1) {
      // m-1, p-1
      cssProperty = shorthand === 'm' ? 'margin' : 'padding';
    } else if (shorthand.length === 2) {
      // mt-1, mb-1, ml-1, mr-1, pt-1, pb-1, pl-1, pr-1
      const prop = shorthand[1];
      const propertyMap = {
        't': shorthand[0] === 'm' ? 'margin-top' : 'padding-top',
        'b': shorthand[0] === 'm' ? 'margin-bottom' : 'padding-bottom',
        'l': shorthand[0] === 'm' ? 'margin-left' : 'padding-left',
        'r': shorthand[0] === 'm' ? 'margin-right' : 'padding-right'
      };
      cssProperty = propertyMap[prop];
    } else if (shorthand.length === 3) {
      // mx-1, my-1
      const axis = shorthand[2];
      if (axis === 'x') {
        cssProperty = shorthand[0] === 'm' ? 'margin-left' : 'padding-left';
        cssValue = `${convertedValue}${unit}; ${shorthand[0] === 'm' ? 'margin-right' : 'padding-right'}: ${convertedValue}${unit}`;
      } else if (axis === 'y') {
        cssProperty = shorthand[0] === 'm' ? 'margin-top' : 'padding-top';
        cssValue = `${convertedValue}${unit}; ${shorthand[0] === 'm' ? 'margin-bottom' : 'padding-bottom'}: ${convertedValue}${unit}`;
      }
    }

    return `.${className} { ${cssProperty}: ${cssValue}; }`;
  }

  /**
   * 生成布局CSS规则
   */
  generateLayoutRule(className) {
    const layoutRules = {
      'flex': 'display: flex',
      'block': 'display: block',
      'inline': 'display: inline',
      'inline-block': 'display: inline-block',
      'hidden': 'display: none',
      'grid': 'display: grid',
      'container': 'max-width: 1200px; margin: 0 auto',
      'mx-auto': 'margin-left: auto; margin-right: auto',
      'text-center': 'text-align: center',
      'text-left': 'text-align: left',
      'text-right': 'text-align: right',
      'w-full': 'width: 100%',
      'h-full': 'height: 100%',
      'w-auto': 'width: auto',
      'h-auto': 'height: auto'
    };

    if (layoutRules[className]) {
      return `.${className} { ${layoutRules[className]}; }`;
    }

    return null;
  }

  /**
   * 生成响应式CSS规则
   */
  generateResponsiveRule(className) {
    const responsiveMatch = className.match(/^(\w+):(.+)$/);
    if (!responsiveMatch) return null;

    const [, breakpoint, classWithoutBreakpoint] = responsiveMatch;
    const mediaQuery = this.config.breakpoints[breakpoint];

    if (!mediaQuery) return null;

    // 递归生成基础规则
    const baseRule = this.generateRule(classWithoutBreakpoint);
    if (baseRule) {
      return `@media (min-width: ${mediaQuery}) { ${baseRule} }`;
    }

    return null;
  }

  /**
   * 生成交互状态CSS规则
   */
  generateInteractiveRule(className) {
    const interactiveMatch = className.match(/^(hover|focus|active):(.+)$/);
    if (!interactiveMatch) return null;

    const [, state, classWithoutState] = interactiveMatch;
    
    // 递归生成基础规则
    const baseRule = this.generateRule(classWithoutState);
    if (baseRule) {
      return `.${classWithoutState}:${state} { ${baseRule.replace(/^\.([^:]+):/, '')} }`;
    }

    return null;
  }

  /**
   * 生成单个CSS规则
   */
  generateRule(className) {
    // 响应式规则
    const responsiveRule = this.generateResponsiveRule(className);
    if (responsiveRule) return responsiveRule;

    // 交互状态规则
    const interactiveRule = this.generateInteractiveRule(className);
    if (interactiveRule) return interactiveRule;

    // 颜色规则
    const colorRule = this.generateColorRule(className);
    if (colorRule) return colorRule;

    // 间距规则
    const spacingRule = this.generateSpacingRule(className);
    if (spacingRule) return spacingRule;

    // 布局规则
    const layoutRule = this.generateLayoutRule(className);
    if (layoutRule) return layoutRule;

    return null;
  }

  /**
   * 处理文件
   */
  async processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const classes = this.parseCSSClasses(content);
      const cssRules = [];

      console.log(`\n📄 处理文件: ${filePath}`);
      console.log(`🎯 发现类名: ${Array.from(classes).join(', ')}`);

      for (const className of classes) {
        const rule = this.generateRule(className);
        if (rule) {
          cssRules.push(rule);
          console.log(`✅ 生成规则: .${className}`);
        } else {
          console.log(`⚠️  未匹配规则: .${className}`);
        }
      }

      return cssRules.join('\n');
    } catch (error) {
      console.error(`处理文件失败: ${filePath}`, error);
      return '';
    }
  }

  /**
   * 处理目录
   */
  async processDirectory(dirPath, outputPath) {
    try {
      const files = await fs.readdir(dirPath);
      const cssFiles = files.filter(file => 
        file.endsWith('.vue') || file.endsWith('.wxml') || file.endsWith('.html')
      );

      let allCSS = '';
      let totalRules = 0;

      for (const file of cssFiles) {
        const filePath = path.join(dirPath, file);
        const fileCSS = await this.processFile(filePath);
        if (fileCSS) {
          allCSS += `\n/* ${file} */\n${fileCSS}\n`;
          totalRules += fileCSS.split('\n').filter(line => line.trim()).length;
        }
      }

      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFile(outputPath, allCSS, 'utf-8');
        console.log(`\n💾 CSS已生成: ${outputPath}`);
      }

      return {
        css: allCSS,
        stats: {
          totalClasses: cssFiles.length,
          totalRules: totalRules
        }
      };
    } catch (error) {
      console.error('处理目录失败:', error);
      return { css: '', stats: { totalClasses: 0, totalRules: 0 } };
    }
  }
}

// CLI逻辑
async function main() {
  const args = process.argv.slice(2);
  const optimizer = new SimpleCSSOptimizer();

  if (args.length === 0) {
    console.log(`
🚀 CSS Optimizer 简化测试版

用法:
  node test-simple.js <文件或目录路径> [输出文件]

示例:
  node test-simple.js examples/comprehensive-example.vue
  node test-simple.js examples/ output.css
  node test-simple.js examples/comprehensive-example.vue examples/miniprogram-example.wxml
    `);
    return;
  }

  const sourcePath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : null;

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 文件或目录不存在: ${sourcePath}`);
    process.exit(1);
  }

  try {
    const stats = await fs.stat(sourcePath);
    
    if (stats.isDirectory()) {
      const result = await optimizer.processDirectory(sourcePath, outputPath);
      console.log(`\n📊 构建统计:`);
      console.log(`  处理文件: ${result.stats.totalClasses} 个`);
      console.log(`  生成规则: ${result.stats.totalRules} 个`);
    } else {
      const css = await optimizer.processFile(sourcePath);
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await fs.writeFile(outputPath, css, 'utf-8');
        console.log(`\n💾 CSS已生成: ${outputPath}`);
      } else {
        console.log('\n📄 生成的CSS:');
        console.log(css || '/* 未生成任何CSS规则 */');
      }
    }
  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('CLI运行失败:', error);
    process.exit(1);
  });
}

module.exports = { SimpleCSSOptimizer };