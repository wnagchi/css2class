import { Config } from '../types';
/**
 * 配置管理器类
 */
export declare class ConfigManager {
    private config;
    private configPath;
    private watchers;
    constructor(configPath?: string);
    /**
     * 加载配置文件
     */
    load(): Promise<Config>;
    /**
     * 获取当前配置
     */
    getConfig(): Config;
    /**
     * 重新加载配置
     */
    reload(): Promise<Config>;
    /**
     * 监听配置文件变化
     */
    watch(callback: () => void): () => void;
    /**
     * 停止所有监听器
     */
    unwatchAll(): void;
    /**
     * 验证和标准化配置
     */
    private validateAndNormalizeConfig;
    /**
     * 验证配置格式
     */
    private validateConfig;
    /**
     * 获取配置文件的绝对路径
     */
    getConfigPath(): string;
    /**
     * 检查配置是否已加载
     */
    isLoaded(): boolean;
}
//# sourceMappingURL=config-manager.d.ts.map