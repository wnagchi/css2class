class CssFormatter {
  constructor(format = 'multiLine') {
    this.format = format;
  }

  // 将 states 变体转换为 CSS 伪类选择器片段
  // 例如：['hover','first','odd'] -> ':hover:first-child:nth-child(odd)'
  buildStatePseudoSelectors(stateVariants = []) {
    if (!Array.isArray(stateVariants) || stateVariants.length === 0) {
      return '';
    }

    const map = {
      hover: 'hover',
      focus: 'focus',
      active: 'active',
      disabled: 'disabled',
      first: 'first-child',
      last: 'last-child',
      odd: 'nth-child(odd)',
      even: 'nth-child(even)',
    };

    const pseudos = [];
    for (const v of stateVariants) {
      if (!v || typeof v !== 'string') continue;
      const key = v.trim();
      if (!key) continue;
      const mapped = map[key] || key; // 允许用户扩展为标准伪类（如 visited、focus-within 等）
      pseudos.push(mapped);
    }

    return pseudos.length > 0 ? ':' + pseudos.join(':') : '';
  }

  // 转义 CSS 选择器中的特殊字符
  // 确保生成的 CSS 选择器能正确匹配 HTML/WXML 中的 class 名
  escapeSelector(selector) {
    if (!selector || typeof selector !== 'string') {
      return selector;
    }

    // 转义特殊字符：冒号、感叹号、空格、斜杠等
    // CSS 选择器中需要转义的字符：: ! / \ 空格等
    // 使用反斜杠转义，例如 sm:w-100 -> sm\:w-100
    return selector.replace(/([:!\/\\\s])/g, '\\$1');
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
  // stateVariants: 状态变体数组（如 ['hover', 'focus']），用于生成伪类选择器
  formatRule(selector, properties, format = null, stateVariants = []) {
    const targetFormat = format || this.format;

    // 构建带伪类的选择器
    const escapedSelector = this.escapeSelector(selector);
    const pseudoSelectors = this.buildStatePseudoSelectors(stateVariants);
    const fullSelector = escapedSelector + pseudoSelectors;

    if (targetFormat === 'compressed') {
      return this.formatRuleCompressed(fullSelector, properties);
    } else if (targetFormat === 'singleLine') {
      return this.formatRuleSingleLine(fullSelector, properties);
    } else {
      return this.formatRuleMultiLine(fullSelector, properties);
    }
  }

  // 多行格式（默认）
  // 注意：selector 参数已经包含转义和伪类（由 formatRule 处理）
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
  // 注意：selector 参数已经包含转义和伪类（由 formatRule 处理）
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
  // 注意：selector 参数已经包含转义和伪类（由 formatRule 处理）
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
  // 但保留 CLASS2CSS 分区标记注释（用于 appendDelta 模式）
  compressCSS(cssString) {
    // 先提取并临时替换分区标记，避免被移除
    const partitionMarkers = {
      baseStart: '/* CLASS2CSS:BASE_START */',
      baseEnd: '/* CLASS2CSS:BASE_END */',
      mediaStart: '/* CLASS2CSS:MEDIA_START */',
      mediaEnd: '/* CLASS2CSS:MEDIA_END */',
      deltaStart: '/* CLASS2CSS:DELTA_START */',
    };
    
    const placeholders = {};
    let tempCss = cssString;
    for (const [key, marker] of Object.entries(partitionMarkers)) {
      if (tempCss.includes(marker)) {
        const placeholder = `__CLASS2CSS_${key.toUpperCase()}__`;
        placeholders[placeholder] = marker;
        tempCss = tempCss.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
      }
    }

    // 压缩 CSS（移除注释等）
    let compressed = tempCss
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

    // 恢复分区标记
    for (const [placeholder, marker] of Object.entries(placeholders)) {
      compressed = compressed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), marker);
    }

    return compressed;
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

  // 规范化响应式规则顺序：
  // - 保证普通规则（base）在前
  // - 保证 @media 块在后（并按 min-width 升序稳定排序）
  // 该步骤不做“字母排序”，只解决媒体查询被覆盖导致的失效问题。
  normalizeResponsiveOrder(cssString) {
    if (!cssString || typeof cssString !== 'string') {
      return '';
    }

    const blocks = [];
    let prefix = '';
    let suffix = '';

    let i = 0;
    let braceCount = 0;
    let blockStart = -1;
    let cursor = 0;

    while (i < cssString.length) {
      const char = cssString[i];

      if (char === '{') {
        if (braceCount === 0) {
          const preSelector = cssString.slice(cursor, i);

          // 尽量把无大括号语句（常见：@import/@charset）保留在 prefix
          const lastSemicolon = preSelector.lastIndexOf(';');
          if (lastSemicolon !== -1) {
            const before = preSelector.slice(0, lastSemicolon + 1);
            if (blocks.length === 0) {
              prefix += before;
            }
            blockStart = cursor + lastSemicolon + 1;
          } else {
            blockStart = cursor;
          }
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && blockStart !== -1) {
          const fullRule = cssString.slice(blockStart, i + 1);
          const openBraceIdx = fullRule.indexOf('{');
          const selectorRaw = openBraceIdx === -1 ? '' : fullRule.slice(0, openBraceIdx);
          const selectorTrim = selectorRaw.trim();
          const cleanSelector = selectorTrim.replace(/^\./, '').trim();

          if (cleanSelector) {
            blocks.push({
              selectorTrim,
              fullRule,
              index: blocks.length,
            });
          }

          cursor = i + 1;
          blockStart = -1;
        }
      }

      i++;
    }

    if (cursor < cssString.length) {
      suffix = cssString.slice(cursor);
    }

    if (blocks.length === 0) {
      return cssString;
    }

    const isMediaBlock = (b) => typeof b.selectorTrim === 'string' && b.selectorTrim.startsWith('@media');
    const isAtRuleBlock = (b) => typeof b.selectorTrim === 'string' && b.selectorTrim.startsWith('@');

    const parseMinWidth = (selectorTrim) => {
      if (!selectorTrim) return Number.POSITIVE_INFINITY;
      const m = selectorTrim.match(/min-width\s*:\s*([^)]+)\)/i);
      if (!m) return Number.POSITIVE_INFINITY;
      const raw = String(m[1] || '').trim();
      const num = parseFloat(raw);
      return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
    };

    const baseBlocks = [];
    const mediaBlocks = [];
    const otherAtBlocks = [];

    for (const b of blocks) {
      if (isMediaBlock(b)) {
        mediaBlocks.push(b);
      } else if (isAtRuleBlock(b)) {
        otherAtBlocks.push(b);
      } else {
        baseBlocks.push(b);
      }
    }

    // 不改变 base 的原始顺序（稳定）
    baseBlocks.sort((a, b) => a.index - b.index);
    otherAtBlocks.sort((a, b) => a.index - b.index);

    // media 按 min-width 升序（同断点保持稳定）
    mediaBlocks.sort((a, b) => {
      const wa = parseMinWidth(a.selectorTrim);
      const wb = parseMinWidth(b.selectorTrim);
      if (wa < wb) return -1;
      if (wa > wb) return 1;
      return a.index - b.index;
    });

    return (
      prefix +
      otherAtBlocks.map((b) => b.fullRule).join('') +
      baseBlocks.map((b) => b.fullRule).join('') +
      mediaBlocks.map((b) => b.fullRule).join('') +
      suffix
    );
  }

  // 拆分 CSS 为 base 规则和 @media 规则（用于 appendDelta 分区插入）
  // 返回 { baseCss, mediaCss, otherAtRulesPrefix, suffix }
  splitBaseAndMedia(cssString) {
    if (!cssString || typeof cssString !== 'string') {
      return { baseCss: '', mediaCss: '', otherAtRulesPrefix: '', suffix: '' };
    }

    const blocks = [];
    let prefix = '';
    let suffix = '';

    let i = 0;
    let braceCount = 0;
    let blockStart = -1;
    let cursor = 0;

    while (i < cssString.length) {
      const char = cssString[i];

      if (char === '{') {
        if (braceCount === 0) {
          const preSelector = cssString.slice(cursor, i);

          // 尽量把无大括号语句（常见：@import/@charset）保留在 prefix
          const lastSemicolon = preSelector.lastIndexOf(';');
          if (lastSemicolon !== -1) {
            const before = preSelector.slice(0, lastSemicolon + 1);
            if (blocks.length === 0) {
              prefix += before;
            }
            blockStart = cursor + lastSemicolon + 1;
          } else {
            blockStart = cursor;
          }
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && blockStart !== -1) {
          const fullRule = cssString.slice(blockStart, i + 1);
          const openBraceIdx = fullRule.indexOf('{');
          const selectorRaw = openBraceIdx === -1 ? '' : fullRule.slice(0, openBraceIdx);
          const selectorTrim = selectorRaw.trim();

          if (selectorTrim) {
            blocks.push({
              selectorTrim,
              fullRule,
              index: blocks.length,
            });
          }

          cursor = i + 1;
          blockStart = -1;
        }
      }

      i++;
    }

    if (cursor < cssString.length) {
      suffix = cssString.slice(cursor);
    }

    if (blocks.length === 0) {
      return { baseCss: cssString, mediaCss: '', otherAtRulesPrefix: prefix, suffix };
    }

    const isMediaBlock = (b) => typeof b.selectorTrim === 'string' && b.selectorTrim.startsWith('@media');
    const isAtRuleBlock = (b) => typeof b.selectorTrim === 'string' && b.selectorTrim.startsWith('@');

    const baseBlocks = [];
    const mediaBlocks = [];
    const otherAtBlocks = [];

    for (const b of blocks) {
      if (isMediaBlock(b)) {
        mediaBlocks.push(b);
      } else if (isAtRuleBlock(b)) {
        otherAtBlocks.push(b);
      } else {
        baseBlocks.push(b);
      }
    }

    // 保持原始顺序（不排序）
    const baseCss = baseBlocks.map((b) => b.fullRule).join('');
    const mediaCss = mediaBlocks.map((b) => b.fullRule).join('');
    const otherAtRulesPrefix = prefix + otherAtBlocks.map((b) => b.fullRule).join('');

    return { baseCss, mediaCss, otherAtRulesPrefix, suffix };
  }

  // 对CSS规则进行字母排序
  sortCSSRules(cssString) {
    if (!cssString || typeof cssString !== 'string') {
      return '';
    }

    // 解析顶层块（支持 @media 嵌套），并按语义分组排序。
    // 目标：避免 @media 块被排到普通规则前面导致覆盖失效（base 覆盖 media）。
    // 同时尽量保留非块语句（如 @import/@charset）在输出中的存在。

    const blocks = [];
    let prefix = '';
    let suffix = '';

    let i = 0;
    let braceCount = 0;
    let blockStart = -1;
    let selectorStart = 0;
    let cursor = 0;

    while (i < cssString.length) {
      const char = cssString[i];

      if (char === '{') {
        if (braceCount === 0) {
          // 顶层块开始：selector 在 cursor..i 之间
          const preSelector = cssString.slice(cursor, i);

          // 尽量把无大括号的 at-rule 语句（常见：@import/@charset）留在 prefix 中
          // 规则：如果 preSelector 中有分号，将最后一个分号之前的内容视为 prefix
          const lastSemicolon = preSelector.lastIndexOf(';');
          if (lastSemicolon !== -1) {
            const before = preSelector.slice(0, lastSemicolon + 1);
            const after = preSelector.slice(lastSemicolon + 1);
            // prefix 只在第一个块之前累积
            if (blocks.length === 0) {
              prefix += before;
            }
            selectorStart = cursor + lastSemicolon + 1;
            // 把分号后的空白等内容归到块里，避免丢失格式
            blockStart = selectorStart;
            // after 这段会包含在 blockStart.. 中，不需要单独处理
          } else {
            selectorStart = cursor;
            blockStart = selectorStart;
          }
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && blockStart !== -1) {
          // 顶层块结束
          const fullRule = cssString.slice(blockStart, i + 1);
          const openBraceIdx = fullRule.indexOf('{');
          const selectorRaw = openBraceIdx === -1 ? '' : fullRule.slice(0, openBraceIdx);
          const selectorTrim = selectorRaw.trim();

          // 清理选择器：移除点号前缀用于排序（注意：转义字符不需要处理，排序时保持原样）
          const cleanSelector = selectorTrim.replace(/^\./, '').trim();

          if (cleanSelector) {
            blocks.push({
              selector: cleanSelector,
              selectorTrim,
              fullRule,
              index: blocks.length, // 用于稳定排序
            });
          }

          cursor = i + 1;
          blockStart = -1;
          selectorStart = cursor;
        }
      }

      i++;
    }

    // 保留尾部非块内容（例如末尾注释/换行）
    if (cursor < cssString.length) {
      suffix = cssString.slice(cursor);
    }

    // 如果没有解析到块，直接返回原字符串
    if (blocks.length === 0) {
      return cssString;
    }

    const isMediaBlock = (b) => typeof b.selectorTrim === 'string' && b.selectorTrim.startsWith('@media');
    const isAtRuleBlock = (b) => typeof b.selectorTrim === 'string' && b.selectorTrim.startsWith('@');

    const parseMinWidth = (selectorTrim) => {
      if (!selectorTrim) return Number.POSITIVE_INFINITY;
      // 兼容：@media(min-width:640px) / @media (min-width: 640px)
      const m = selectorTrim.match(/min-width\s*:\s*([^)]+)\)/i);
      if (!m) return Number.POSITIVE_INFINITY;
      const raw = String(m[1] || '').trim();
      const num = parseFloat(raw);
      return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
    };

    const baseBlocks = [];
    const mediaBlocks = [];
    const otherAtBlocks = [];

    for (const b of blocks) {
      if (isMediaBlock(b)) {
        mediaBlocks.push(b);
      } else if (isAtRuleBlock(b)) {
        otherAtBlocks.push(b);
      } else {
        baseBlocks.push(b);
      }
    }

    // base：按选择器字母排序（不区分大小写）
    baseBlocks.sort((a, b) => {
      const selectorA = a.selector.toLowerCase();
      const selectorB = b.selector.toLowerCase();
      if (selectorA < selectorB) return -1;
      if (selectorA > selectorB) return 1;
      return a.index - b.index; // 稳定
    });

    // media：按 min-width 升序（同断点保持稳定）
    mediaBlocks.sort((a, b) => {
      const wa = parseMinWidth(a.selectorTrim);
      const wb = parseMinWidth(b.selectorTrim);
      if (wa < wb) return -1;
      if (wa > wb) return 1;
      return a.index - b.index;
    });

    // 组合顺序：
    // - prefix（@import/@charset 等）
    // - 其他 at-rule（保持原顺序）
    // - base 规则（排序后）
    // - @media（最后，保证覆盖方向正确）
    // - suffix
    return (
      prefix +
      otherAtBlocks.map((b) => b.fullRule).join('') +
      baseBlocks.map((b) => b.fullRule).join('') +
      mediaBlocks.map((b) => b.fullRule).join('') +
      suffix
    );
  }
}

module.exports = CssFormatter;

