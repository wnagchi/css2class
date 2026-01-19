const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

/**
 * VitePress 文档服务器管理器
 */
class DocsServer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.process = null;
    this.port = null;
    this.host = null;
    this.docsDir = path.join(__dirname, '../../docs');
  }

  /**
   * 获取可用端口
   * @param {number} startPort - 起始端口
   * @returns {Promise<number>}
   */
  async getAvailablePort(startPort = 5173) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();

      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => {
          resolve(port);
        });
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // 端口被占用，尝试下一个端口
          try {
            server.close(() => {});
          } catch (_) {}
          this.getAvailablePort(startPort + 1)
            .then(resolve)
            .catch(reject);
        } else {
          try {
            server.close(() => {});
          } catch (_) {}
          reject(err);
        }
      });
    });
  }

  /**
   * 启动 VitePress 开发服务器
   * @param {Object} options - 启动选项
   * @param {number} options.port - 端口号（默认自动寻找）
   * @param {string} options.host - 主机地址（默认 127.0.0.1）
   * @returns {Promise<{port: number, url: string}>}
   */
  async start(options = {}) {
    if (this.process) {
      throw new Error('Docs server is already running');
    }

    const { port: requestedPort = 5173, host = '127.0.0.1' } = options;

    // 获取可用端口
    this.port = await this.getAvailablePort(requestedPort);
    this.host = host;

    // 查找 VitePress CLI 脚本
    const vitepressPath = path.join(__dirname, '../../node_modules/vitepress/bin/vitepress.js');

    // 检查 VitePress 是否已安装
    if (!fs.existsSync(vitepressPath)) {
      throw new Error(
        'VitePress is not installed. Please run: npm install --save-dev vitepress'
      );
    }

    // 启动 VitePress dev server
    const args = [
      vitepressPath,
      'dev',
      this.docsDir,
      '--port',
      String(this.port),
      '--host',
      host
    ];

    const cwd = path.join(__dirname, '../..');

    this.process = spawn(process.execPath, args, {
      stdio: 'inherit',
      cwd,
      env: { ...process.env },
    });

    this.process.on('error', (error) => {
      this.eventBus?.emit('docs:server:error', { error: error.message });
    });

    this.process.on('exit', (code) => {
      this.process = null;
      this.eventBus?.emit('docs:server:exited', { code });
    });

    const url = `http://${host}:${this.port}`;

    // VitePress dev server 启动需要一点时间；这里做一个轻量延迟，避免立刻打开浏览器时失败
    await new Promise((resolve) => setTimeout(resolve, 1200));

    this.eventBus?.emit('docs:server:started', { port: this.port, host: this.host, url });

    return { port: this.port, url };
  }

  /**
   * 停止文档服务器
   */
  async stop() {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.process) {
          try {
            this.process.kill('SIGKILL');
          } catch (_) {}
        }
        resolve();
      }, 5000);

      this.process.on('exit', () => {
        this.process = null;
        this.eventBus?.emit('docs:server:stopped');
        clearTimeout(timeout);
        resolve();
      });

      // 发送终止信号
      if (process.platform === 'win32') {
        // Windows 使用 taskkill
        spawn('taskkill', ['/pid', this.process.pid, '/F', '/T'], {
          stdio: 'ignore',
        });
      } else {
        // Unix-like 系统使用 kill
        try {
          this.process.kill('SIGTERM');
        } catch (_) {}
      }
    });
  }

  /**
   * 检查服务器是否运行中
   * @returns {boolean}
   */
  isRunning() {
    return this.process !== null && this.process.exitCode === null;
  }

  /**
   * 获取服务器 URL
   * @returns {string|null}
   */
  getUrl() {
    if (!this.port || !this.host) {
      return null;
    }
    return `http://${this.host}:${this.port}`;
  }
}

module.exports = DocsServer;
