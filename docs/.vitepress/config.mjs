/*
 * @LastEditors: biz
 */
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Class2CSS',
  description: '企业级原子化CSS生成工具，支持智能单位处理、配置验证、性能缓存和向后兼容',
  lang: 'zh-CN',

  themeConfig: {
    nav: [
      { text: '文档', link: '/guide/getting-started' },
      { text: '参考', link: '/guide/config' },
      { text: 'FAQ', link: '/guide/faq' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: '类名语法与生成规则', link: '/guide/concepts' },
            { text: '单位与转换策略', link: '/guide/units' },
            { text: 'Important 与静态类', link: '/guide/important-and-static' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: 'CLI', link: '/guide/cli' },
            { text: '规则参考', link: '/guide/rules-reference' },
            { text: '配置模板（可复制）', link: '/guide/config-template' },
            { text: '配置', link: '/guide/config' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '增量模式（只增不删）', link: '/guide/incremental' },
          ],
        },
        {
          text: '帮助',
          items: [{ text: '常见问题', link: '/guide/faq' }],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/wnagchi/css2class' }],

    search: {
      provider: 'local',
    },

    outline: { level: [2, 3] },
  },
});

