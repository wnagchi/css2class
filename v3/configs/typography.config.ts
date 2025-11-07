// 字体排版配置模块

interface TypographyProperty {
  [key: string]: string;
}

interface TypographyConfig {
  fontSize: TypographyProperty;
  fontWeight: TypographyProperty;
  lineHeight: TypographyProperty;
  letterSpacing: TypographyProperty;
  textAlign: TypographyProperty;
}

const config: TypographyConfig = {
  // 字体大小
  fontSize: {
    text: 'font-size',
  },

  // 字体粗细
  fontWeight: {
    font: 'font-weight',
    'font-thin': 'font-weight: 100;',
    'font-extralight': 'font-weight: 200;',
    'font-light': 'font-weight: 300;',
    'font-normal': 'font-weight: 400;',
    'font-medium': 'font-weight: 500;',
    'font-semibold': 'font-weight: 600;',
    'font-bold': 'font-weight: 700;',
    'font-extrabold': 'font-weight: 800;',
    'font-black': 'font-weight: 900;',
    bold: 'font-weight: bold;',
  },

  // 行高
  lineHeight: {
    leading: 'line-height',
  },

  // 字间距
  letterSpacing: {
    spacing: 'letter-spacing',
    tracking: 'letter-spacing',
  },

  // 文本对齐
  textAlign: {
    'text-left': 'text-align: left;',
    'text-center': 'text-align: center;',
    'text-right': 'text-align: right;',
    'text-justify': 'text-align: justify;',
  },
};

export default config;