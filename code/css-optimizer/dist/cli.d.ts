#!/usr/bin/env node
/**
 * CLI主程序
 */
declare class CSSOptimizerCLI {
    private program;
    private optimizer;
    constructor();
    /**
     * 设置CLI命令
     */
    private setupCLI;
    /**
     * 初始化示例项目
     */
    private initProject;
    /**
     * 构建CSS
     */
    private build;
    /**
     * 监听模式
     */
    private watch;
    /**
     * 显示统计信息
     */
    private showStats;
    /**
     * 缓存管理
     */
    private manageCache;
    /**
     * 运行CLI
     */
    run(): Promise<void>;
    /**
     * 创建默认配置
     */
    private createDefaultConfig;
    /**
     * 创建示例文件
     */
    private createExampleFiles;
    /**
     * 创建package.json
     */
    private createPackageJson;
    /**
     * 格式化字节数
     */
    private formatBytes;
}
export { CSSOptimizerCLI };
//# sourceMappingURL=cli.d.ts.map