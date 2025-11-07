import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { Config } from '../types';

/**
 * 配置管理器类
 */
export class ConfigManager {
  private config: Config | null = null;
  private configPath: string;
  private watchers: (() => void)[] = [];

  constructor(configPath: string = './config.yaml') {
    this.configPath = path.resolve(configPath);
  }

  /**
   * 加载配置文件
   */
  async load(): Promise<Config> {
    try {
      if (!await fs.pathExists(this.configPath)) {
        throw new Error(`配置文件不存在: ${this.configPath}`);
      }

      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const rawConfig = yaml.parse(configContent);
      
      // 验证和标准化配置
      this.config = this.validateAndNormalizeConfig(rawConfig);
      
      return this.config;
    } catch (error) {
      throw new Error(`加载配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): Config {
    if (!this.config) {
      throw new Error('配置尚未加载，请先调用 load() 方法');
    }
    return this.config;
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<Config> {
    return this.load();
  }

  /**
   * 监听配置文件变化
   */
  watch(callback: () => void): () => void {
    const watcher = fs.watch(this.configPath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        // 延迟加载，避免文件写入过程中的读取错误
        setTimeout(async () => {
          try {
            await this.reload();
            callback();
          } catch (error) {
            console.error('重新加载配置失败:', error);
          }
        }, 100);
      }
    });

    const unwatch = () => {
      watcher.close();
    };

    this.watchers.push(unwatch);
    return unwatch;
  }

  /**
   * 停止所有监听器
   */
  unwatchAll(): void {
    this.watchers.forEach(unwatch => unwatch());
    this.watchers = [];
  }

  /**
   * 验证和标准化配置
   */
  private validateAndNormalizeConfig(rawConfig: any): Config {
    // 默认配置
    const defaultConfig: Config = {
      targetFormats: ['.vue', '.wxml', '.html'],
      colors: {
        customColors: {},
        directColorParsing: true
      },
      units: {
        spacing: {
          defaultUnit: 'px',
          conversions: { px: 1, rpx: 2, rem: 16 }
        },
        fontSize: {
          defaultUnit: 'px',
          conversions: { px: 1, rpx: 2, rem: 16 }
        },
        width: {
          defaultUnit: 'px',
          conversions: { px: 1, rpx: 2, rem: 16 }
        }
      },
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      },
      rules: {
        spacing: {
          margin: ['m', 'mt', 'mr', 'mb', 'ml', 'mx', 'my'],
          padding: ['p', 'pt', 'pr', 'pb', 'pl', 'px', 'py'],
          gap: ['gap', 'gap-x', 'gap-y']
        },
        layout: {
          display: ['block', 'inline', 'inline-block', 'flex', 'grid'],
          flex: ['flex', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap'],
          justify: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around'],
          align: ['items-start', 'items-center', 'items-end', 'items-stretch'],
          position: ['relative', 'absolute', 'fixed', 'sticky']
        },
        colors: {
          background: ['bg'],
          text: ['text'],
          border: ['border', 'border-t', 'border-r', 'border-b', 'border-l']
        },
        fonts: {
          fontSize: ['text'],
          fontWeight: ['font'],
          fontFamily: ['font-family']
        },
        interactions: {
          hover: ['hover:'],
          focus: ['focus:'],
          active: ['active:'],
          disabled: ['disabled:']
        }
      },
      output: {
        outputMode: 'separate',
        cssFileName: 'styles.css',
        minify: false,
        sourceMap: true
      },
      watch: {
        debounceMs: 300,
        enabled: true,
        ignorePatterns: [
          'node_modules/**',
          'dist/**',
          'build/**',
          '.git/**',
          '**/*.css',
          '**/*.js',
          '**/*.ts'
        ]
      },
      performance: {
        cache: {
          enabled: true,
          maxSize: 1000,
          ttl: 300000
        },
        parallel: {
          enabled: true,
          maxWorkers: 4
        },
        memoryLimit: '512MB'
      }
    };

    // 合并配置
    const config = { ...defaultConfig, ...rawConfig };

    // 验证必需字段
    this.validateConfig(config);

    return config;
  }

  /**
   * 验证配置格式
   */
  private validateConfig(config: Config): void {
    if (!Array.isArray(config.targetFormats)) {
      throw new Error('targetFormats 必须是数组格式');
    }

    if (typeof config.colors !== 'object' || config.colors === null) {
      throw new Error('colors 配置格式错误');
    }

    if (typeof config.units !== 'object' || config.units === null) {
      throw new Error('units 配置格式错误');
    }

    if (typeof config.breakpoints !== 'object' || config.breakpoints === null) {
      throw new Error('breakpoints 配置格式错误');
    }

    if (typeof config.rules !== 'object' || config.rules === null) {
      throw new Error('rules 配置格式错误');
    }

    if (typeof config.output !== 'object' || config.output === null) {
      throw new Error('output 配置格式错误');
    }

    if (typeof config.watch !== 'object' || config.watch === null) {
      throw new Error('watch 配置格式错误');
    }

    if (typeof config.performance !== 'object' || config.performance === null) {
      throw new Error('performance 配置格式错误');
    }

    // 验证单位转换配置
    for (const [category, unitConfig] of Object.entries(config.units)) {
      if (!unitConfig.defaultUnit || typeof unitConfig.conversions !== 'object') {
        throw new Error(`units.${category} 配置格式错误`);
      }
    }

    // 验证性能配置
    if (config.performance.cache.maxSize <= 0) {
      throw new Error('performance.cache.maxSize 必须大于 0');
    }

    if (config.performance.cache.ttl <= 0) {
      throw new Error('performance.cache.ttl 必须大于 0');
    }

    if (config.performance.parallel.maxWorkers <= 0) {
      throw new Error('performance.parallel.maxWorkers 必须大于 0');
    }
  }

  /**
   * 获取配置文件的绝对路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 检查配置是否已加载
   */
  isLoaded(): boolean {
    return this.config !== null;
  }
}