// 布局配置模块
module.exports = {
  // 显示属性
  display: {
    block: "display: block;",
    inline: "display: inline;",
    "inline-block": "display: inline-block;",
    flex: "display: flex;",
    "inline-flex": "display: inline-flex;",
    grid: "display: grid;",
    "inline-grid": "display: inline-grid;",
    table: "display: table;",
    hidden: "display: none;"
  },

  // 定位
  position: {
    static: "position: static;",
    fixed: "position: fixed;",
    absolute: "position: absolute;",
    relative: "position: relative;",
    sticky: "position: sticky;",
    position: {
      re: "relative",
      ab: "absolute",
      fi: "fixed",
      sta: "static",
      sti: "sticky",
    }
  },

  // Flexbox
  flexbox: {
    "flex-1": "flex: 1;",
    "shrink-0": "flex-shrink: 0;",
    "flex-cen": "align-items: center;justify-content: center;",
    "flex-row": "flex-direction: row;",
    "flex-col": "flex-direction: column;",
    "flex-wrap": "flex-wrap: wrap;",
    "flex-nowrap": "flex-wrap: nowrap;",
    "items-start": "align-items: flex-start;",
    "items-center": "align-items: center;",
    "items-end": "align-items: flex-end;",
    "items-stretch": "align-items: stretch;",
    "justify-start": "justify-content: flex-start;",
    "justify-center": "justify-content: center;",
    "justify-end": "justify-content: flex-end;",
    "justify-between": "justify-content: space-between;",
    "justify-around": "justify-content: space-around;",
    "justify-evenly": "justify-content: space-evenly;",
    flex_tb_cen: "align-items: center;",
    flex_lr: "justify-content: space-between;",
    flex_lr_end: "justify-content: flex-end;",
    flex_lr_cen: "justify-content: center;",
    flex_cen: "align-items: center;justify-content: center;"
  },

  // 尺寸
  sizing: {
    'w-full': "width: 100%;",
    'h-full': "height: 100%;",
    'w-screen': "width: 100vw;",
    'h-screen': "height: 100vh;"
  },

  // 溢出
  overflow: {
    "overflow-auto": "overflow: auto;",
    "overflow-hidden": "overflow: hidden;",
    "overflow-visible": "overflow: visible;",
    "overflow-scroll": "overflow: scroll;",
    "overflow-x-auto": "overflow-x: auto;",
    "overflow-x-hidden": "overflow-x: hidden;",
    "overflow-x-scroll": "overflow-x: scroll;",
    "overflow-y-auto": "overflow-y: auto;",
    "overflow-y-hidden": "overflow-y: hidden;",
    "overflow-y-scroll": "overflow-y: scroll;",
    overflow: ["hidden", "auto", "scroll"],
    overflow_x: ["hidden", "auto", "scroll"],
    overflow_y: ["hidden", "auto", "scroll"]
  },

  // 盒模型
  boxModel: {
    "box-border": "box-sizing: border-box;",
    "box-content": "box-sizing: content-box;",
    box_sizing: "box-sizing:border-box;"
  },

  // 边框
  borders: {
    "border-solid": "border-style: solid;",
    "border-dashed": "border-style: dashed;",
    "border-dotted": "border-style: dotted;",
    "border-none": "border: none;",
    border_no: " border:none !important;"
  },

  // 光标
  cursor: {
    "cursor-auto": "cursor: auto;",
    "cursor-default": "cursor: default;",
    "cursor-pointer": "cursor: pointer;",
    "cursor-wait": "cursor: wait;",
    "cursor-text": "cursor: text;",
    "cursor-move": "cursor: move;",
    "cursor-not-allowed": "cursor: not-allowed;",
    cursor: ["pointer", "auto", "move"]
  }
};