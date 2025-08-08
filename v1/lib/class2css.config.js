module.exports={
    //目标文件位置
    path:'./index.html',
    //文件输出目录
    cssOutPath:'./css',
    // 输出文件信息 可设置文件名，扩展名
    fileName:'index.css',
    //是否压缩css
    compression:false,
    //默认单位
    baseUnit:'px',
    // 需处理的class
    cssName:{
        line_h:'line-height',
        weight:{
            classArr:['font-weight'],
            unit:'-'
        },
        mr_l:'margin-left',
        mr_r:'margin-right',
        mr_t:'margin-top',
        mr_b:'margin-bottom',
        mr_lr:{
            classArr:[
                'margin-left',
                'margin-right'
            ]
        },
        mr_tb:{
            classArr:[
                'margin-top',
                'margin-bottom'
            ]
        },
        mr:'margin',
        pd:'padding',
        pd_l:'padding-left',
        pd_r:'padding-right',
        pd_t:'padding-top',
        pd_b:'padding-bottom',
        pd_lr:{
            classArr:[
                'padding-left',
                'padding-right'
            ]
        },
        pd_tb:{
            classArr:[
                'padding-top',
                'padding-bottom'
            ]
        },
        size:{
            classArr:['font-size'],
            unit:'px'
        },
        w:'width',
        h:'height',
        max_w:'max-width',
        max_h:'max-height',
        min_w:'min-width',
        min_h:'min-height',
        left:'left',
        top:'top',
        b_r:'border-radius',
        right:'right',
        bottom:'bottom',
        op:{
            classArr:['opacity'],
            unit:'-'
        }
    },
    // 默认class
    baseClassName:{
        color:['red','yellow'],
        cursor:['pointer','auto','move'],
        overflow:['hidden','auto','scroll'],
        overflow_x:['hidden','auto','scroll'],
        overflow_y:['hidden','auto','scroll'],
        display:['block','inline','none','flex','grid','table'],
        box_sizing:'box-sizing:border-box;',
        flex:'display:flex',
        flex_tb_cen:'align-items: center;',
        flex_lr:'justify-content: space-between;',
        flex_lr_end:'justify-content: flex-end;',
        flex_lr_cen:'justify-content: center;',
        flex_cen:'align-items: center;justify-content: center;',
        position:{re:'relative',ab:'absolute',fi:'fixed',sta:'static',sti:'sticky'},
        border_no:' border:none !important;',
        bold:'font-weight: bold;'
    }
}
