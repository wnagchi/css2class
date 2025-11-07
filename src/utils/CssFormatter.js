class CssFormatter {
  constructor(format = 'multiLine') {
    this.format = format;
  }

  // 设置格式
  setFormat(format) {
    if (['multiLine', 'singleLine', 'compressed'].includes(format)) {
      this.format = format;
    } else {
      this.format = 'multiLine'; // 默认格式
    }
  }

  // 获取当前格式
  getFormat() {
    return this.format;
  }

  // 格式化单个CSS规则
  formatRule(selector, properties, format = null) {
    const targetFormat = format || this.format;

    if (targetFormat === 'compressed') {
      return this.formatRuleCompressed(selector, properties);
    } else if (targetFormat === 'singleLine') {
      return this.formatRuleSingleLine(selector, properties);
    } else {
      return this.formatRuleMultiLine(selector, properties);
    }
  }

  // 多行格式（默认）
  formatRuleMultiLine(selector, properties) {
    if (Array.isArray(properties)) {
      // 属性数组格式：[{property: 'margin', value: '10rpx'}, ...]
      let css = `\n.${selector} {\n`;
      properties.forEach(({ property, value }) => {
        css += `  ${property}: ${value};\n`;
      });
      css += `}\n`;
      return css;
    } else if (typeof properties === 'string') {
      // 字符串格式：'margin: 10rpx;'
      return `\n.${selector} {\n  ${properties}\n}\n`;
    }
    return '';
  }

  // 单行格式
  formatRuleSingleLine(selector, properties) {
    if (Array.isArray(properties)) {
      // 属性数组格式
      const propsStr = properties.map(({ property, value }) => `${property}: ${value}`).join('; ');
      return `.${selector} { ${propsStr}; }\n`;
    } else if (typeof properties === 'string') {
      // 字符串格式
      return `.${selector} { ${properties}; }\n`;
    }
    return '';
  }

  // 压缩格式
  formatRuleCompressed(selector, properties) {
    if (Array.isArray(properties)) {
      // 属性数组格式
      const propsStr = properties.map(({ property, value }) => `${property}:${value}`).join(';');
      return `.${selector}{${propsStr}}`;
    } else if (typeof properties === 'string') {
      // 字符串格式，移除空格但保留分号（除了最后一个分号）
      let cleanProps = properties.replace(/\s+/g, ''); // 移除所有空格
      // 确保属性之间有分号分隔，但移除末尾的分号
      cleanProps = cleanProps.replace(/;+$/, ''); // 移除末尾的分号
      // 确保分号后面没有空格（虽然已经移除了空格，但为了安全）
      cleanProps = cleanProps.replace(/;+/g, ';'); // 多个分号合并为一个
      return `.${selector}{${cleanProps}}`;
    }
    return '';
  }

  // 格式化完整CSS字符串
  formatCSS(cssString, format = null) {
    if (!cssString || typeof cssString !== 'string') {
      return '';
    }

    const targetFormat = format || this.format;

    if (targetFormat === 'compressed') {
      return this.compressCSS(cssString);
    } else if (targetFormat === 'singleLine') {
      return this.singleLineCSS(cssString);
    } else {
      return this.multiLineCSS(cssString);
    }
  }

  // 压缩CSS（去除所有空格、换行、注释）
  compressCSS(cssString) {
    return cssString
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
      .replace(/\s+/g, ' ') // 多个空格合并为一个
      .replace(/\s*{\s*/g, '{') // 移除大括号周围的空格
      .replace(/\s*}\s*/g, '}') // 移除大括号周围的空格
      .replace(/\s*:\s*/g, ':') // 移除冒号周围的空格
      .replace(/\s*;\s*/g, ';') // 移除分号周围的空格（保留分号）
      .replace(/\s*,\s*/g, ',') // 移除逗号周围的空格
      .replace(/;\s*}/g, '}') // 移除结束大括号前的分号（CSS规则结束不需要分号）
      .replace(/\s+/g, '') // 移除所有剩余空格
      .trim();
  }

  // 单行CSS（每个规则单行，但规则之间换行）
  singleLineCSS(cssString) {
    // 先压缩，然后按规则分割，每行一个规则
    const compressed = this.compressCSS(cssString);
    // 按 } 分割规则
    const rules = compressed.split('}').filter(rule => rule.trim());
    return rules.map(rule => rule.trim() + '}').join('\n') + '\n';
  }

  // 多行CSS（格式化，保持可读性）
  multiLineCSS(cssString) {
    // 如果已经是多行格式，直接返回
    if (cssString.includes('\n')) {
      return cssString;
    }

    // 将压缩的CSS转换为多行格式
    let formatted = cssString
      .replace(/\{/g, ' {\n  ')
      .replace(/;/g, ';\n  ')
      .replace(/\}/g, '\n}\n')
      .replace(/\n\s*\n/g, '\n'); // 移除多余空行

    // 清理格式
    formatted = formatted
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index, array) => {
        if (line.endsWith('{')) {
          return line;
        } else if (line === '}') {
          return line;
        } else if (line.endsWith(';')) {
          return '  ' + line;
        }
        return '  ' + line;
      })
      .join('\n') + '\n';

    return formatted;
  }

  // 格式化属性值对数组为字符串
  formatProperties(properties, format = null) {
    const targetFormat = format || this.format;

    if (Array.isArray(properties)) {
      if (targetFormat === 'compressed') {
        return properties.map(({ property, value }) => `${property}:${value}`).join(';');
      } else if (targetFormat === 'singleLine') {
        return properties.map(({ property, value }) => `${property}: ${value}`).join('; ');
      } else {
        return properties.map(({ property, value }) => `  ${property}: ${value};\n`).join('');
      }
    }
    return '';
  }

  // 对CSS规则进行字母排序
  sortCSSRules(cssString) {
    if (!cssString || typeof cssString !== 'string') {
      return '';
    }

    // 解析CSS规则：逐字符解析，跟踪大括号嵌套
    const rules = [];
    let currentRule = '';
    let braceCount = 0;
    let selector = '';
    let i = 0;

    while (i < cssString.length) {
      const char = cssString[i];

      if (char === '{') {
        if (braceCount === 0) {
          // 找到选择器结束
          selector = currentRule.trim();
          currentRule = '{';
        } else {
          currentRule += char;
        }
        braceCount++;
      } else if (char === '}') {
        currentRule += char;
        braceCount--;
        if (braceCount === 0) {
          // 找到规则结束
          // 清理选择器：移除点号前缀用于排序
          const cleanSelector = selector.replace(/^\./, '').trim();
          if (cleanSelector) {
            rules.push({
              selector: cleanSelector,
              fullRule: selector + currentRule,
            });
          }
          currentRule = '';
          selector = '';
        }
      } else {
        currentRule += char;
      }
      i++;
    }

    // 如果没有匹配到规则，返回原字符串
    if (rules.length === 0) {
      return cssString;
    }

    // 按选择器名称进行字母排序（不区分大小写）
    rules.sort((a, b) => {
      const selectorA = a.selector.toLowerCase();
      const selectorB = b.selector.toLowerCase();
      if (selectorA < selectorB) return -1;
      if (selectorA > selectorB) return 1;
      return 0;
    });

    // 重新组合CSS规则
    return rules.map(rule => rule.fullRule).join('');
  }
}

module.exports = CssFormatter;

