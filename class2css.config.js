// ========== 工具配置文件 ==========
// 此文件包含工具运行相关的配置（系统设置、输出路径等）
// 样式规则配置请查看 styles.config.js

// 引入样式规则配置
const stylesConfig = require('./styles.config.js');

const config = {
  // ========== 系统基础配置 ==========
  system: {
    // 基础单位设置
    cssFormat: 'compressed', // 'multiLine' | 'singleLine' | 'compressed'
    baseUnit: 'rpx',
    // 单位转换比例 生成样式单位=设置单位*比例
    unitConversion: 2,
    // 是否压缩CSS
    compression: true,
    // 是否对生成的CSS类进行字母排序
    sortClasses: true, // true | false，启用后会将CSS规则按选择器名称进行字母排序
    // 智能单位处理策略
    unitStrategy: {
      // 自动检测：如果用户写了单位，保持原单位；如果没写，使用默认单位
      autoDetect: true,
      // 属性默认单位映射
      propertyUnits: {
        'font-size': 'rpx',
        'width|height': 'rpx',
        opacity: '', // 无单位
        'z-index': '', // 无单位
        'line-height': '', // 可以无单位
        'border-radius': 'rpx',
      },
    },
  },

  // ========== 输出配置 ==========
  output: {
    //文件输出目录
    path: 'D:/code/membership-weapp/subpackages/portal/lib',
    // 输出文件信息 可设置文件名，扩展名
    fileName: 'commom12.wxss',
    commonCssPath: 'D:/code/css2class/common.css', // 共用CSS文件路径
  },

  // ========== Important标识配置（从样式配置引入） ==========
  importantFlags: stylesConfig.importantFlags,
  // 多文件构建 如果存在该字段 则覆盖 cssOutPath fileName
  multiFile: {
    entry: {
      // 扫描/监听入口：
      // - string：单目录/单文件
      // - string[]：多目录/多文件（目录与文件可混用）
      path: 'D:/code/membership-weapp/subpackages/portal',
      // 需要监听的文件名
      // fileName:[
      //     'index1.html'
      // ],
      // 文件类型 需要监听的文件扩展名用逗号隔开
      fileType: ['html', 'wxml'],
    },
    // 多文件监听时的导出配置
    output: {
      // css文件导出目录
      // filePath：将css文件导出到监听文件对应的目录下，并且生成同名的样式文件
      //uniFile:将所有样式导出到单文件中
      cssOutType: 'uniFile',
      //文件输出目录
      // 如果填写该目录 css文件就会生成到该目录下
      path: 'D:/code/membership-weapp/subpackages/portal/lib',
      // 输出文件名 cssOutType为uniFile的情况下生效
      fileName: 'index.wxss',
      // 输出文件格式 在cssOutType为filePath的情况下生效
      fileType: 'wxss',
      
      // ========== 增量模式配置 ==========
      // incrementalOnlyAdd: 是否启用"只增不删"增量模式
      // 当设置为 true 时：
      // 1. 启动时会从输出文件（uniFile）中解析已存在的 class 作为基线
      // 2. 后续文件变更时，只会新增 class，不会删除已存在的 class（包括基线中的 class）
      // 3. 初次扫描后会提示输出文件中存在但当前项目未使用的 class，由用户决定是否清理
      // 默认值: false（标准模式：会删除不再使用的 class）
      // 注意：启用此模式后，输出文件可能会随时间增长，建议定期检查未使用的 class
      incrementalOnlyAdd: true,
      
      // incrementalBaseline: 增量基线来源策略（当前仅支持 'fromOutputFile'）
      // 'fromOutputFile': 从输出文件（uniFile）中解析已存在的 class
      incrementalBaseline: 'fromOutputFile',
      
      // rebuildOnStart: 是否在启动时重建输出文件（仅在 incrementalOnlyAdd=true 时生效）
      // 当设置为 true 时：
      // 1. 每次启动都会先执行全量扫描，清理上一次运行累积的多余规则
      // 2. 重新生成并排序/格式化输出文件，确保输出文件只包含当前扫描到的 class
      // 3. 然后进入 watch 增量模式（运行期只增不删）
      // 默认值: true（推荐开启，保证每次启动输出文件都是干净且排序好的）
      rebuildOnStart: true,
      
      // unusedReportLimit: 未使用 class 报告的最大显示数量
      // 启动重建时，如果发现上一版输出文件中存在但当前项目未使用的 class，会在控制台打印
      // 此配置限制打印的示例数量，避免输出过长
      // 默认值: 200
      unusedReportLimit: 200,
      
      // ========== uniFile 写入模式配置 ==========
      // uniFileWriteMode: uniFile 模式的写入策略
      // 'rewrite': 每次写入全量重算并覆盖写文件（默认，保持兼容）
      // 'appendDelta': 启动时全量重建写入基础段（已压缩/排序），运行期只把新增 class 的规则追加到文件末尾
      // 注意：当 uniFileWriteMode='appendDelta' 时，rebuildOnStart 必须为 true（否则历史垃圾无法自动清理）
      // 默认值: 'rewrite'
      uniFileWriteMode: 'appendDelta',
    },
  },

  // ========== 样式规则配置（从 styles.config.js 引入） ==========
  atomicRules: stylesConfig.atomicRules,
  baseClassName: stylesConfig.baseClassName,
  variants: stylesConfig.variants,
  breakpoints: stylesConfig.breakpoints,
};

function getConfig() {
  return config;
}

module.exports = getConfig();
