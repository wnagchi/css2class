class Logger {
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;
    this.level = options.level || 'info'; // debug, info, warn, error
    this.enableTimestamp = options.enableTimestamp !== false;
    this.enableDebug = options.enableDebug || false;

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
  }

  formatMessage(level, message) {
    const timestamp = this.enableTimestamp ? `[${new Date().toLocaleString()}]` : '';
    const levelTag = `[${level.toUpperCase()}]`;
    return `${timestamp} ${levelTag} ${message}`.trim();
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  debug(message, ...args) {
    if (this.shouldLog('debug') && this.enableDebug) {
      const formattedMessage = this.formatMessage('debug', message);
      console.log(formattedMessage, ...args);
      this.eventBus.emit('log:debug', { message, args });
    }
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      const formattedMessage = this.formatMessage('info', message);
      console.log(formattedMessage, ...args);
      this.eventBus.emit('log:info', { message, args });
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message);
      console.warn(formattedMessage, ...args);
      this.eventBus.emit('log:warn', { message, args });
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message);
      console.error(formattedMessage, ...args);
      this.eventBus.emit('log:error', { message, args });
    }
  }

  // 特定领域的日志方法
  config(message, ...args) {
    this.info(`[CONFIG] ${message}`, ...args);
  }

  cache(message, ...args) {
    this.debug(`[CACHE] ${message}`, ...args);
  }

  parser(message, ...args) {
    this.debug(`[PARSER] ${message}`, ...args);
  }

  generator(message, ...args) {
    this.debug(`[GENERATOR] ${message}`, ...args);
  }

  watcher(message, ...args) {
    this.info(`[WATCHER] ${message}`, ...args);
  }

  writer(message, ...args) {
    this.info(`[WRITER] ${message}`, ...args);
  }

  scan(message, ...args) {
    this.info(`[SCAN] ${message}`, ...args);
  }

  // 日志级别设置
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.level = level;
      this.info(`Log level changed to: ${level}`);
      this.eventBus.emit('log:level:changed', level);
    } else {
      this.error(`Invalid log level: ${level}`);
    }
  }

  getLevel() {
    return this.level;
  }

  // 调试模式切换
  setDebugMode(enabled) {
    this.enableDebug = enabled;
    this.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    this.eventBus.emit('log:debug:changed', enabled);
  }

  // 时间戳切换
  setTimestamp(enabled) {
    this.enableTimestamp = enabled;
    this.info(`Timestamp ${enabled ? 'enabled' : 'disabled'}`);
    this.eventBus.emit('log:timestamp:changed', enabled);
  }

  // 性能日志
  time(label) {
    if (this.shouldLog('debug')) {
      console.time(`[PERF] ${label}`);
      this.eventBus.emit('log:time:start', label);
    }
  }

  timeEnd(label) {
    if (this.shouldLog('debug')) {
      console.timeEnd(`[PERF] ${label}`);
      this.eventBus.emit('log:time:end', label);
    }
  }

  // 统计信息日志
  stats(stats) {
    this.info('[STATS]', stats);
    this.eventBus.emit('log:stats', stats);
  }

  // 错误日志增强
  errorWithContext(message, error, context = {}) {
    this.error(message);
    if (error && error.stack) {
      this.error('Stack trace:', error.stack);
    }
    if (Object.keys(context).length > 0) {
      this.error('Context:', context);
    }
    this.eventBus.emit('log:error:withContext', { message, error, context });
  }
}

module.exports = Logger;
