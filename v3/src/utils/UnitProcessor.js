class UnitProcessor {
  constructor(config) {
    this.config = config;
    this.baseUnit = config.system?.baseUnit || config.baseUnit || 'px';
    this.unitConversion = parseFloat(config.system?.unitConversion || config.unitConversion || 1);

    // 特殊属性映射（不需要单位的属性）
    this.unitlessProperties = new Set([
      'opacity',
      'z-index',
      'line-height',
      'font-weight',
      'flex',
      'flex-grow',
      'flex-shrink',
      'order',
    ]);

    // 属性默认单位映射
    this.propertyUnits = {
      'font-size': this.baseUnit,
      width: this.baseUnit,
      height: this.baseUnit,
      'max-width': this.baseUnit,
      'max-height': this.baseUnit,
      margin: this.baseUnit,
      'margin-top': this.baseUnit,
      'margin-right': this.baseUnit,
      'margin-bottom': this.baseUnit,
      'margin-left': this.baseUnit,
      padding: this.baseUnit,
      'padding-top': this.baseUnit,
      'padding-right': this.baseUnit,
      'padding-bottom': this.baseUnit,
      'padding-left': this.baseUnit,
      'border-width': this.baseUnit,
      'border-top-width': this.baseUnit,
      'border-right-width': this.baseUnit,
      'border-bottom-width': this.baseUnit,
      'border-left-width': this.baseUnit,
      'border-radius': this.baseUnit,
      top: this.baseUnit,
      right: this.baseUnit,
      bottom: this.baseUnit,
      left: this.baseUnit,
      gap: this.baseUnit,
      'letter-spacing': this.baseUnit,
      transition: 'ms',
      opacity: '',
      'z-index': '',
      'line-height': '',
      'font-weight': '',
    };
  }

  // 智能解析数值和单位
  parseValue(value, property, defaultUnit = null) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return value;
    }

    const valueStr = String(value).trim();

    // 处理特殊值
    if (this.isSpecialValue(valueStr)) {
      return valueStr;
    }

    // 检测用户是否已指定单位
    const hasUnit = this.detectUnit(valueStr);
    if (hasUnit) {
      return valueStr; // 保持用户指定的单位
    }

    // 提取数值部分
    const numericValue = this.extractNumericValue(valueStr);
    if (numericValue === null) {
      return valueStr; // 无法解析，保持原值
    }

    // 处理特殊属性
    if (this.isSpecialProperty(property, numericValue)) {
      return this.processSpecialProperty(property, numericValue);
    }

    // 应用单位转换
    const convertedValue = this.applyUnitConversion(numericValue, property, defaultUnit);

    return convertedValue;
  }

  // 检测特殊值
  isSpecialValue(value) {
    const specialValues = [
      'auto',
      'none',
      'inherit',
      'initial',
      'unset',
      '100%',
      '50%',
      '25%',
      '75%',
      '100vw',
      '100vh',
      '50vw',
      '50vh',
      'full',
      'screen',
      'min',
      'max',
    ];

    return (
      specialValues.includes(value) ||
      value.includes('%') ||
      value.includes('vw') ||
      value.includes('vh')
    );
  }

  // 检测单位
  detectUnit(value) {
    const unitPattern = /[a-zA-Z%]+$/;
    return unitPattern.test(value);
  }

  // 提取数值
  extractNumericValue(value) {
    const numericPattern = /^-?\d*\.?\d+/;
    const match = value.match(numericPattern);
    return match ? parseFloat(match[0]) : null;
  }

  // 检查特殊属性
  isSpecialProperty(property, value) {
    return (
      this.unitlessProperties.has(property) || property === 'opacity' || property === 'line-height'
    );
  }

  // 处理特殊属性
  processSpecialProperty(property, value) {
    switch (property) {
      case 'opacity':
        // 如果值大于1，假设是百分比，转换为0-1范围
        return value > 1 ? value / 100 : value;

      case 'line-height':
        // 如果值大于10，假设是像素值，转换为无单位值
        return value > 10 ? value / 16 : value; // 假设基准字体大小为16px

      case 'z-index':
      case 'font-weight':
        return value; // 保持原值

      default:
        return value;
    }
  }

  // 应用单位转换
  applyUnitConversion(numericValue, property, defaultUnit = null) {
    // 确定使用的单位
    const unit = defaultUnit || this.getPropertyUnit(property);

    // 如果属性不需要单位，直接返回数值
    if (!unit) {
      return numericValue;
    }

    // 应用转换比例
    const convertedValue = numericValue * this.unitConversion;

    // 格式化数值（避免过多小数位）
    const formattedValue = this.formatNumericValue(convertedValue);

    return `${formattedValue}${unit}`;
  }

  // 获取属性默认单位
  getPropertyUnit(property) {
    // 检查属性映射
    if (this.propertyUnits[property]) {
      return this.propertyUnits[property];
    }

    // 检查属性类型
    if (property.includes('width') || property.includes('height')) {
      return this.baseUnit;
    }

    if (property.includes('margin') || property.includes('padding')) {
      return this.baseUnit;
    }

    if (property.includes('border')) {
      return this.baseUnit;
    }

    if (property.includes('font-size')) {
      return this.baseUnit;
    }

    if (
      property.includes('top') ||
      property.includes('right') ||
      property.includes('bottom') ||
      property.includes('left')
    ) {
      return this.baseUnit;
    }

    // 默认返回基础单位
    return this.baseUnit;
  }

  // 格式化数值
  formatNumericValue(value) {
    // 如果是整数，返回整数
    if (Number.isInteger(value)) {
      return value;
    }

    // 如果是小数，保留最多3位小数
    return parseFloat(value.toFixed(3));
  }

  // 批量处理值
  processValues(values, property, defaultUnit = null) {
    if (Array.isArray(values)) {
      return values.map((value) => this.parseValue(value, property, defaultUnit));
    }

    return this.parseValue(values, property, defaultUnit);
  }

  // 处理规则配置
  processRuleConfig(ruleConfig, value) {
    const { properties, defaultUnit, value: fixedValue, skipConversion } = ruleConfig;

    // 如果有固定值，直接返回
    if (fixedValue !== undefined) {
      return fixedValue;
    }

    // 如果跳过转换，直接拼接单位
    if (skipConversion === true && defaultUnit) {
      const numericValue = this.extractNumericValue(value);
      if (numericValue !== null) {
        // 处理小数点（保持与传统方式一致）
        let processedValue = numericValue;
        if (String(value).startsWith('0') && String(value).length > 1) {
          processedValue = parseFloat('0.' + String(value).substring(1));
        }
        return `${processedValue}${defaultUnit}`;
      }
    }

    // 处理多个属性
    if (Array.isArray(properties)) {
      return properties.map((property) => this.parseValue(value, property, defaultUnit));
    }

    // 处理单个属性
    return this.parseValue(value, properties, defaultUnit);
  }

  // 验证单位一致性
  validateUnitConsistency(property, value, expectedUnit) {
    if (!expectedUnit) {
      return true; // 无单位属性
    }

    const detectedUnit = this.extractUnit(value);
    if (!detectedUnit) {
      return true; // 无单位值，使用默认单位
    }

    return detectedUnit === expectedUnit;
  }

  // 提取单位
  extractUnit(value) {
    const unitPattern = /[a-zA-Z%]+$/;
    const match = String(value).match(unitPattern);
    return match ? match[0] : null;
  }

  // 获取配置信息
  getConfig() {
    return {
      baseUnit: this.baseUnit,
      unitConversion: this.unitConversion,
      propertyUnits: this.propertyUnits,
      unitlessProperties: Array.from(this.unitlessProperties),
    };
  }

  // 更新配置
  updateConfig(newConfig) {
    if (newConfig.system?.baseUnit) {
      this.baseUnit = newConfig.system.baseUnit;
    }

    if (newConfig.system?.unitConversion) {
      this.unitConversion = parseFloat(newConfig.system.unitConversion);
    }

    // 更新属性单位映射
    if (newConfig.system?.propertyUnits) {
      this.propertyUnits = { ...this.propertyUnits, ...newConfig.system.propertyUnits };
    }
  }

  // 创建CSS属性值
  createCSSValue(property, value, unit = null) {
    const processedValue = this.parseValue(value, property, unit);

    // 如果是数组（多个属性），返回CSS字符串
    if (Array.isArray(processedValue)) {
      return processedValue
        .map((val, index) => {
          const prop = Array.isArray(property) ? property[index] : property;
          return `${prop}: ${val};`;
        })
        .join('');
    }

    return `${property}: ${processedValue};`;
  }
}

module.exports = UnitProcessor;
