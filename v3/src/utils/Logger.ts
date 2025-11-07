import { EventBus } from '../core/EventBus';

interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  enableTimestamp?: boolean;
  enableDebug?: boolean;
}

interface LogData {
  message: string;
  args?: any[];
  error?: any;
  context?: any;
}

export default class Logger {
  private eventBus: EventBus;
  private level: 'debug' | 'info' | 'warn' | 'error';
  private enableTimestamp: boolean;
  private enableDebug: boolean;

  private readonly levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(eventBus: EventBus, options: LoggerOptions = {}) {
    this.eventBus = eventBus;
    this.level = options.level || 'info';
    this.enableTimestamp = options.enableTimestamp !== false;
    this.enableDebug = options.enableDebug || false;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = this.enableTimestamp ? `[${new Date().toLocaleString()}]` : '';
    const levelTag = `[${level.toUpperCase()}]`;
    return `${timestamp} ${levelTag} ${message}`.trim();
  }

  private shouldLog(level: keyof typeof this.levels): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug') && this.enableDebug) {
      const formattedMessage = this.formatMessage('debug', message);
      console.log(formattedMessage, ...args);
      this.eventBus.emit('log:debug', { message, args });
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const formattedMessage = this.formatMessage('info', message);
      console.log(formattedMessage, ...args);
      this.eventBus.emit('log:info', { message, args });
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message);
      console.warn(formattedMessage, ...args);
      this.eventBus.emit('log:warn', { message, args });
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message);
      console.error(formattedMessage, ...args);
      this.eventBus.emit('log:error', { message, args });
    }
  }

  // 特定领域的日志方法
  config(message: string, ...args: any[]): void {
    this.info(`[CONFIG] ${message}`, ...args);
  }

  cache(message: string, ...args: any[]): void {
    this.debug(`[CACHE] ${message}`, ...args);
  }

  parser(message: string, ...args: any[]): void {
    this.debug(`[PARSER] ${message}`, ...args);
  }

  generator(message: string, ...args: any[]): void {
    this.debug(`[GENERATOR] ${message}`, ...args);
  }

  watcher(message: string, ...args: any[]): void {
    this.info(`[WATCHER] ${message}`, ...args);
  }

  writer(message: string, ...args: any[]): void {
    this.info(`[WRITER] ${message}`, ...args);
  }

  scan(message: string, ...args: any[]): void {
    this.info(`[SCAN] ${message}`, ...args);
  }

  // 日志级别设置
  setLevel(level: keyof typeof this.levels): void {
    if (this.levels.hasOwnProperty(level)) {
      this.level = level;
      this.info(`Log level changed to: ${level}`);
      this.eventBus.emit('log:level:changed', { level });
    } else {
      this.error(`Invalid log level: ${level}`);
    }
  }

  getLevel(): string {
    return this.level;
  }

  // 调试模式切换
  setDebugMode(enabled: boolean): void {
    this.enableDebug = enabled;
    this.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    this.eventBus.emit('log:debug:changed', { enabled });
  }

  // 时间戳切换
  setTimestamp(enabled: boolean): void {
    this.enableTimestamp = enabled;
    this.info(`Timestamp ${enabled ? 'enabled' : 'disabled'}`);
    this.eventBus.emit('log:timestamp:changed', { enabled });
  }

  // 性能日志
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`[PERF] ${label}`);
      this.eventBus.emit('log:time:start', { label });
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`[PERF] ${label}`);
      this.eventBus.emit('log:time:end', { label });
    }
  }

  // 统计信息日志
  stats(stats: any): void {
    this.info('[STATS]', stats);
    this.eventBus.emit('log:stats', stats);
  }

  // 错误日志增强
  errorWithContext(message: string, error: any, context: any = {}): void {
    this.error(message);
    if (error && error.stack) {
      this.error('Stack trace:', error.stack);
    }
    if (Object.keys(context).length > 0) {
      this.error('Context:', context);
    }
    this.eventBus.emit('log:error:withContext', { message, error, context });
  }

  // 获取日志统计信息
  getStats(): any {
    return {
      level: this.level,
      enableTimestamp: this.enableTimestamp,
      enableDebug: this.enableDebug,
    };
  }

  // 批量日志
  group(message: string): void {
    console.group(`[GROUP] ${message}`);
    this.eventBus.emit('log:group:start', { message });
  }

  groupEnd(): void {
    console.groupEnd();
    this.eventBus.emit('log:group:end');
  }

  // 表格日志
  table(data: any, columns?: string[]): void {
    if (this.shouldLog('info')) {
      console.table(data, columns);
      this.eventBus.emit('log:table', { data, columns });
    }
  }

  // 清除控制台
  clear(): void {
    console.clear();
    this.eventBus.emit('log:clear');
  }

  // 创建子Logger
  child(context: string): Logger {
    const childLogger = new Logger(this.eventBus, {
      level: this.level,
      enableTimestamp: this.enableTimestamp,
      enableDebug: this.enableDebug,
    });

    // 重写基本方法以添加上下文
    const originalInfo = childLogger.info.bind(childLogger);
    childLogger.info = (message: string, ...args: any[]) => {
      originalInfo(`[${context}] ${message}`, ...args);
    };

    const originalDebug = childLogger.debug.bind(childLogger);
    childLogger.debug = (message: string, ...args: any[]) => {
      originalDebug(`[${context}] ${message}`, ...args);
    };

    const originalWarn = childLogger.warn.bind(childLogger);
    childLogger.warn = (message: string, ...args: any[]) => {
      originalWarn(`[${context}] ${message}`, ...args);
    };

    const originalError = childLogger.error.bind(childLogger);
    childLogger.error = (message: string, ...args: any[]) => {
      originalError(`[${context}] ${message}`, ...args);
    };

    return childLogger;
  }
}