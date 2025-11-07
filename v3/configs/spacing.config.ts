// 间距配置模块

interface ClassArrayProperty {
  classArr: string[];
}

interface SpacingProperty {
  [key: string]: string | ClassArrayProperty;
}

interface SpacingConfig {
  margin: SpacingProperty;
  padding: SpacingProperty;
  gap: SpacingProperty;
}

const config: SpacingConfig = {
  // Margin 配置
  margin: {
    m: 'margin',
    mt: 'margin-top',
    mr: 'margin-right',
    mb: 'margin-bottom',
    ml: 'margin-left',
    mx: {
      classArr: ['margin-left', 'margin-right'],
    },
    my: {
      classArr: ['margin-top', 'margin-bottom'],
    },
  },

  // Padding 配置
  padding: {
    p: 'padding',
    pt: 'padding-top',
    pr: 'padding-right',
    pb: 'padding-bottom',
    pl: 'padding-left',
    px: {
      classArr: ['padding-left', 'padding-right'],
    },
    py: {
      classArr: ['padding-top', 'padding-bottom'],
    },
  },

  // Gap 配置
  gap: {
    gap: 'gap',
  },
};

export default config;