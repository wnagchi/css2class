// 核心类型定义

export interface SystemConfig {
  baseUnit: 'rpx' | 'px' | 'em' | 'rem';
  unitConversion: number;
  compression: boolean;
  unitStrategy: {
    autoDetect: boolean;
    propertyUnits: Record<string, string>;
  };
}

export interface OutputConfig {
  path: string;
  fileName: string;
}

export interface ImportantFlags {
  prefix?: string[];
  suffix?: string[];
  custom?: string[];
}

export interface MultiFileConfig {
  entry: {
    path: string;
    fileName?: string[];
    fileType: string[];
  };
  output: {
    cssOutType: 'uniFile' | 'filePath';
    path?: string;
    fileName?: string;
    fileType?: string;
  };
}

export interface AtomicRule {
  properties: string[];
  defaultUnit: string;
}

export interface AtomicRules {
  spacing: Record<string, AtomicRule>;
  sizing: Record<string, AtomicRule>;
  typography: Record<string, AtomicRule>;
  positioning: Record<string, AtomicRule>;
  borders: Record<string, AtomicRule>;
  effects: Record<string, AtomicRule>;
}

export interface BaseClassName {
  [key: string]: string | { ABBR: string };
}

export interface Config {
  // 新版配置结构
  system?: SystemConfig;
  // 旧版配置兼容
  baseUnit?: 'rpx' | 'px' | 'em' | 'rem';
  unitConversion?: number;
  compression?: boolean;

  output: OutputConfig;
  importantFlags?: ImportantFlags;
  multiFile?: MultiFileConfig;
  atomicRules?: AtomicRules;
  baseClassName?: BaseClassName;
  cssName?: BaseClassName; // 旧版兼容
  variants?: {
    responsive: string[];
    states: string[];
    darkMode: string[];
  };
}

export interface ClassInfo {
  classArr: string[];
  userStaticClassArr: string[];
  importantClassArr: string[];
}

export interface ParseStats {
  totalCount: number;
  classCount: number;
  staticClassCount: number;
  importantClassCount: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: {
    kb: number;
    mb: number;
  };
}

export interface GenerationStats {
  generatedCount: number;
  generationTime: number;
  cssLength: number;
}

export interface WatchStats {
  watchedPaths: string[];
  isWatching: boolean;
  changeCount: number;
}

export interface Class2CSSOptions {
  configPath?: string;
  cacheSize?: number;
  logger?: {
    level: string;
    enableDebug: boolean;
    enableTimestamp: boolean;
  };
}

export interface Class2CSSStatus {
  isInitialized: boolean;
  isRunning: boolean;
  state: any;
  config: any;
  cache: CacheStats;
  throttle: any;
  parser: ParseStats;
  generator: GenerationStats;
  watcher: WatchStats;
  configWatcher: any;
  writer: any;
  fullScan: any;
  unifiedWriter: any;
}

// 事件类型
export interface EventData {
  [key: string]: any;
}

export type EventHandler = (data?: EventData) => void;

// 文件监听事件
export interface FileChangeEvent {
  type: 'change' | 'add' | 'unlink';
  path: string;
}

// 配置变更事件
export interface ConfigChangeEvent {
  type: string;
  oldValue?: any;
  newValue?: any;
}

// 缓存事件
export interface CacheEvent {
  key: string;
  value?: any;
  operation: 'get' | 'set' | 'delete' | 'clear';
}

// 解析事件
export interface ParseEvent {
  filePath: string;
  classCount: number;
  processingTime: number;
}

// 生成事件
export interface GenerationEvent {
  generatedCount: number;
  cssLength: number;
  generationTime: number;
  filePath?: string;
}

// 清理相关类型
export interface CleanupTask {
  id: string;
  name: string;
  type: 'cache' | 'file' | 'custom';
  priority: number;
  schedule?: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  options: any;
}

export interface CleanupOptions {
  force?: boolean;
  dryRun?: boolean;
  includeCache?: boolean;
  includeFiles?: boolean;
  targets?: string[];
  onProgress?: (stage: string, progress: number, details?: any) => void;
}

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  deletedFiles: string[];
  errors: string[];
  freedSpace: number;
  duration: number;
}

export interface CleanupReport {
  taskId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  results: {
    cache?: any;
    files?: any;
    custom?: any;
  };
  errors: string[];
  summary: {
    totalDeleted: number;
    totalFreedSpace: number;
    tasksExecuted: number;
  };
}