class ClassChangeTracker {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.changeHistory = new Map(); // 存储文件的变化历史
    this.maxHistorySize = 100; // 最大历史记录数
  }

  // 对比class变化
  compareClasses(oldClasses, newClasses, filePath) {
    const oldSet = new Set(oldClasses || []);
    const newSet = new Set(newClasses || []);

    const added = [...newSet].filter((cls) => !oldSet.has(cls));
    const removed = [...oldSet].filter((cls) => !newSet.has(cls));
    const unchanged = [...oldSet].filter((cls) => newSet.has(cls));

    const changes = {
      added,
      removed,
      unchanged,
      total: {
        old: oldSet.size,
        new: newSet.size,
        added: added.length,
        removed: removed.length,
        unchanged: unchanged.length,
      },
      timestamp: Date.now(),
      filePath,
    };

    // 分析变化类型
    changes.categories = this.categorizeChanges(changes);

    // 分析变化原因
    changes.reasons = this.analyzeChangeReasons(changes);

    // 保存到历史记录
    this.saveChangeHistory(changes, filePath);

    // 发射变化事件
    this.eventBus.emit('classChange:detected', changes);

    return changes;
  }

  // 分类变化类型
  categorizeChanges(changes) {
    const categories = {
      structural: [], // 结构变化（新增/删除class）
      content: [], // 内容变化（class值修改）
      style: [], // 样式相关变化
      layout: [], // 布局相关变化
      utility: [], // 工具类变化
    };

    const allChanged = [...changes.added, ...changes.removed];

    allChanged.forEach((className) => {
      if (this.isLayoutClass(className)) {
        categories.layout.push(className);
      } else if (this.isStyleClass(className)) {
        categories.style.push(className);
      } else if (this.isUtilityClass(className)) {
        categories.utility.push(className);
      } else {
        categories.structural.push(className);
      }
    });

    return categories;
  }

  // 分析变化原因
  analyzeChangeReasons(changes) {
    const reasons = {
      layoutAdjustment: false,
      styleUpdate: false,
      responsiveDesign: false,
      componentRefactor: false,
      bugFix: false,
      featureAddition: false,
    };

    const { added, removed } = changes;
    const allChanged = [...added, ...removed];

    // 检测布局调整
    if (this.hasLayoutClasses(allChanged)) {
      reasons.layoutAdjustment = true;
    }

    // 检测样式更新
    if (this.hasStyleClasses(allChanged)) {
      reasons.styleUpdate = true;
    }

    // 检测响应式设计
    if (this.hasResponsiveClasses(allChanged)) {
      reasons.responsiveDesign = true;
    }

    // 检测组件重构
    if (added.length > 5 || removed.length > 5) {
      reasons.componentRefactor = true;
    }

    // 检测功能添加
    if (added.length > 0 && removed.length === 0) {
      reasons.featureAddition = true;
    }

    return reasons;
  }

  // 判断是否为布局类
  isLayoutClass(className) {
    const layoutPatterns = [
      /^(m|p|w|h|max-w|min-w|max-h|min-h|top|right|bottom|left|inset)/,
      /^(flex|grid|block|inline|hidden|visible)/,
      /^(absolute|relative|fixed|sticky)/,
      /^(z-|gap-|space-)/,
      /^(container|wrapper|layout)/,
    ];

    return layoutPatterns.some((pattern) => pattern.test(className));
  }

  // 判断是否为样式类
  isStyleClass(className) {
    const stylePatterns = [
      /^(text-|font-|color-|bg-|border-)/,
      /^(rounded|shadow|opacity|transition)/,
      /^(hover:|focus:|active:|disabled:)/,
      /^(transform|scale|rotate|translate)/,
    ];

    return stylePatterns.some((pattern) => pattern.test(className));
  }

  // 判断是否为工具类
  isUtilityClass(className) {
    const utilityPatterns = [
      /^(cursor-|pointer-events|user-select)/,
      /^(overflow|resize|select)/,
      /^(whitespace|break|hyphens)/,
      /^(list-|table-|caption)/,
    ];

    return utilityPatterns.some((pattern) => pattern.test(className));
  }

  // 检测布局类
  hasLayoutClasses(classes) {
    return classes.some((cls) => this.isLayoutClass(cls));
  }

  // 检测样式类
  hasStyleClasses(classes) {
    return classes.some((cls) => this.isStyleClass(cls));
  }

  // 检测响应式类
  hasResponsiveClasses(classes) {
    const responsivePatterns = [/^(sm:|md:|lg:|xl:|2xl:)/, /^(mobile:|tablet:|desktop:)/];

    return classes.some((cls) => responsivePatterns.some((pattern) => pattern.test(cls)));
  }

  // 生成变化报告
  generateReport(changes, options = {}) {
    const {
      includeDetails = true,
      includeStatistics = true,
      includeCategories = true,
      includeReasons = true,
      maxDisplayItems = 10,
    } = options;

    const report = {
      summary: this.generateSummary(changes),
      timestamp: changes.timestamp,
      filePath: changes.filePath,
    };

    if (includeDetails) {
      report.details = {
        added: changes.added.slice(0, maxDisplayItems),
        removed: changes.removed.slice(0, maxDisplayItems),
        unchanged: changes.unchanged.slice(0, maxDisplayItems),
        hasMore: {
          added: changes.added.length > maxDisplayItems,
          removed: changes.removed.length > maxDisplayItems,
          unchanged: changes.unchanged.length > maxDisplayItems,
        },
      };
    }

    if (includeStatistics) {
      report.statistics = changes.total;
    }

    if (includeCategories) {
      report.categories = changes.categories;
    }

    if (includeReasons) {
      report.reasons = changes.reasons;
    }

    return report;
  }

  // 生成摘要
  generateSummary(changes) {
    const { added, removed, total } = changes;

    if (added.length === 0 && removed.length === 0) {
      return 'No class changes detected';
    }

    let summary = '';

    if (added.length > 0) {
      summary += `Added ${added.length} class${added.length > 1 ? 'es' : ''}`;
    }

    if (removed.length > 0) {
      if (summary) summary += ', ';
      summary += `removed ${removed.length} class${removed.length > 1 ? 'es' : ''}`;
    }

    summary += ` (${total.old} → ${total.new})`;

    return summary;
  }

  // 格式化变化显示
  formatChanges(changes, options = {}) {
    const { useColors = true, showDetails = true, maxItems = 5 } = options;

    const format = {
      summary: this.generateSummary(changes),
      details: {},
    };

    if (showDetails) {
      if (changes.added.length > 0) {
        format.details.added = {
          count: changes.added.length,
          items: changes.added.slice(0, maxItems),
          hasMore: changes.added.length > maxItems,
        };
      }

      if (changes.removed.length > 0) {
        format.details.removed = {
          count: changes.removed.length,
          items: changes.removed.slice(0, maxItems),
          hasMore: changes.removed.length > maxItems,
        };
      }
    }

    if (useColors) {
      format.colors = {
        added: '\x1b[32m', // 绿色
        removed: '\x1b[31m', // 红色
        unchanged: '\x1b[37m', // 白色
        reset: '\x1b[0m', // 重置
      };
    }

    return format;
  }

  // 获取变化统计
  getChangeStatistics(changes) {
    return {
      totalChanges: changes.added.length + changes.removed.length,
      netChange: changes.added.length - changes.removed.length,
      changeRatio:
        changes.total.old > 0
          ? (((changes.added.length + changes.removed.length) / changes.total.old) * 100).toFixed(
              2
            ) + '%'
          : '0%',
      categories: Object.keys(changes.categories).filter(
        (key) => changes.categories[key].length > 0
      ),
      reasons: Object.keys(changes.reasons).filter((key) => changes.reasons[key]),
    };
  }

  // 保存变化历史
  saveChangeHistory(changes, filePath) {
    if (!this.changeHistory.has(filePath)) {
      this.changeHistory.set(filePath, []);
    }

    const history = this.changeHistory.get(filePath);
    history.push({
      ...changes,
      id: this.generateChangeId(),
      timestamp: Date.now(),
    });

    // 限制历史记录大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.eventBus.emit('classChange:history:updated', {
      filePath,
      historySize: history.length,
    });
  }

  // 获取变化历史
  getChangeHistory(filePath, limit = 10) {
    const history = this.changeHistory.get(filePath) || [];
    return history.slice(-limit);
  }

  // 生成变化ID
  generateChangeId() {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 清理历史记录
  clearHistory(filePath = null) {
    if (filePath) {
      this.changeHistory.delete(filePath);
    } else {
      this.changeHistory.clear();
    }

    this.eventBus.emit('classChange:history:cleared', { filePath });
  }

  // 获取统计信息
  getStats() {
    const totalFiles = this.changeHistory.size;
    let totalChanges = 0;
    let totalAdded = 0;
    let totalRemoved = 0;

    for (const [filePath, history] of this.changeHistory.entries()) {
      totalChanges += history.length;
      history.forEach((change) => {
        totalAdded += change.added.length;
        totalRemoved += change.removed.length;
      });
    }

    return {
      totalFiles,
      totalChanges,
      totalAdded,
      totalRemoved,
      averageChangesPerFile: totalFiles > 0 ? (totalChanges / totalFiles).toFixed(2) : 0,
    };
  }
}

module.exports = ClassChangeTracker;
