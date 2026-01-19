const fs = require('fs').promises;
const path = require('path');

/**
 * 从 WXSS/CSS 文件中提取 class 选择器集合
 * 主要用于从输出文件中解析已存在的 class，作为增量模式的基线
 */
class WxssClassExtractor {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * 从 CSS/WXSS 文件中提取所有 class 选择器
   * @param {string} filePath - CSS/WXSS 文件路径
   * @returns {Promise<{classList: Set<string>, staticClassList: Set<string>}>}
   */
  async extractClassesFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.extractClassesFromContent(content);
    } catch (error) {
      // 文件不存在或读取失败时返回空集合
      if (error.code === 'ENOENT') {
        this.eventBus?.emit('wxssExtractor:fileNotFound', { filePath });
        return { classList: new Set(), staticClassList: new Set() };
      }
      this.eventBus?.emit('wxssExtractor:error', { filePath, error: error.message });
      throw error;
    }
  }

  /**
   * 从 CSS 内容中提取 class 选择器
   * @param {string} cssContent - CSS 内容
   * @returns {{classList: Set<string>, staticClassList: Set<string>}}
   */
  extractClassesFromContent(cssContent) {
    const classList = new Set();
    const staticClassList = new Set();

    if (!cssContent || typeof cssContent !== 'string') {
      return { classList, staticClassList };
    }

    // 匹配 CSS 选择器中的 class
    // 支持：
    // - .className { ... }
    // - .className1, .className2 { ... }
    // - .className:hover { ... } (提取 .className)
    // - .className1.className2 { ... } (提取两个 class)
    // 不处理复杂选择器如 .a .b（后代选择器），只提取直接出现的 class
    const selectorRegex = /\.([a-zA-Z0-9_-]+)(?::[a-zA-Z-]+|\[[^\]]+\])?(?:\.([a-zA-Z0-9_-]+))?(?=\s*[,\{])/g;

    let match;
    while ((match = selectorRegex.exec(cssContent)) !== null) {
      // 提取第一个 class
      const className1 = match[1];
      if (className1 && this.isValidClassName(className1)) {
        // 判断是否是静态类（通常是不带连字符的简单类名，或特定前缀）
        // 这里使用简单启发式：如果包含连字符且符合动态类模式，认为是动态类
        if (this.isDynamicClass(className1)) {
          classList.add(className1);
        } else {
          staticClassList.add(className1);
        }
      }

      // 提取第二个 class（如果有，如 .a.b）
      const className2 = match[2];
      if (className2 && this.isValidClassName(className2)) {
        if (this.isDynamicClass(className2)) {
          classList.add(className2);
        } else {
          staticClassList.add(className2);
        }
      }
    }

    // 处理逗号分隔的选择器列表
    // 例如：.class1, .class2, .class3 { ... }
    const commaSeparatedRegex = /\.([a-zA-Z0-9_-]+)(?=\s*[,{])/g;
    let commaMatch;
    while ((commaMatch = commaSeparatedRegex.exec(cssContent)) !== null) {
      const className = commaMatch[1];
      if (className && this.isValidClassName(className)) {
        if (this.isDynamicClass(className)) {
          classList.add(className);
        } else {
          staticClassList.add(className);
        }
      }
    }

    this.eventBus?.emit('wxssExtractor:extracted', {
      classCount: classList.size,
      staticClassCount: staticClassList.size,
    });

    return { classList, staticClassList };
  }

  /**
   * 验证 class 名是否有效
   * @param {string} className
   * @returns {boolean}
   */
  isValidClassName(className) {
    if (!className || typeof className !== 'string') {
      return false;
    }
    // 基本验证：不能为空，不能以数字开头（CSS 规范）
    return className.length > 0 && !/^\d/.test(className);
  }

  /**
   * 判断是否是动态类（通常包含连字符，如 w-100, m-10）
   * @param {string} className
   * @returns {boolean}
   */
  isDynamicClass(className) {
    // 简单启发式：包含连字符的类名通常是动态类
    // 例如：w-100, m-10, text-16 等
    return className.includes('-');
  }

  /**
   * 从文件路径读取并提取（便捷方法）
   * @param {string} filePath
   * @returns {Promise<{classList: Set<string>, staticClassList: Set<string>}>}
   */
  async extractFromFile(filePath) {
    return this.extractClassesFromFile(filePath);
  }
}

module.exports = WxssClassExtractor;
