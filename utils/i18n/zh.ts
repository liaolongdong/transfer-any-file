export default {
  // Common
  common: {
    close: '关闭',
  },

  // App / brand
  appName: 'Transfer Any File',

  // Options / workbench
  options: {
    title: '转换工作台',
    subtitle: '批量转换、预览与编辑，全部在本地完成',
    preferences: '偏好设置',
  },

  // Upload
  upload: {
    drop: '拖拽文件到此处，或点击选择文件',
    replace: '点击或拖拽以替换文件',
    pasteHint: '也可以直接 {key} 粘贴图片或文本',
    selectedCount: '已选择 {count} 个文件',
    unknownFormat: '未知格式',
    unknownFormatNotice: '有 {count} 个文件无法识别格式，将无法转换',
    tooLarge: '文件 "{name}" 超过 100MB，无法处理',
    largeWarning: '文件 "{name}" 较大（{size}），转换可能较慢',
    zipExtracted: '已从 "{name}" 解出 {count} 个可转换文件',
    zipNoFiles: '"{name}" 中没有可转换的文件',
    zipBudget: '"{name}" 解压体积或文件数超出上限，部分文件未导入',
    zipReadFail: '无法读取压缩包 "{name}"，文件可能已损坏',
    addMore: '追加文件',
    clearAll: '清空',
    batchCap: '一次最多处理 {max} 个文件，超出部分已忽略',
    ariaLabel: '选择文件',
    preview: '预览',
    previewUnsupported: '此格式暂不支持预览',
  },

  // Workspace drop overlay (F9)
  workspace: {
    dropHint: '松开以添加到工作区',
  },

  // Preview
  preview: {
    reading: '读取中...',
    resultPlaceholder: '结果内容',
    renderedTab: '预览',
    sourceTab: '源码',
    copied: '已复制到剪贴板',
    docxHint: '文件大小: {size}，请下载后用 Word 打开查看。',
    xlsxHint: '文件大小: {size}，请下载后用 Excel 打开查看。',
    download: '下载',
    renderFailed: '预览渲染失败，请下载后查看',
    zoomIn: '放大',
    zoomOut: '缩小',
  },

  // Comparison view
  comparison: {
    sourceTitle: '原始文件',
    resultTitle: '转换结果',
    editMode: '编辑',
    viewMode: '预览',
    syncScroll: '同步滚动',
    rendered: '渲染',
    source: '源码',
    copy: '复制',
    copied: '已复制到剪贴板',
    noPreview: '当前格式不支持预览',
    sourceOnly: '仅显示原文件',
    splitView: '并排视图',
    resultOnly: '仅显示结果',
  },

  // Format selector
  format: {
    selectTarget: '请选择目标格式',
    noMatch: '没有匹配的目标格式',
    noTarget: '当前格式没有可用的转换目标',
    noRecognizedSource: '这批文件里没有可识别的格式，请换用支持的类型',
    mixedSource: '{count} 种格式',
    categoryDocument: '文档',
    categoryImage: '图片',
    categoryData: '数据',
    conversionPath: '转换路径:',
    disabledSameSource: '与源格式相同',
    disabledUnsupported: '暂不支持转换为该格式',
    disabledImageNoText: '图片无法转换为文本或表格数据（需 OCR，暂不支持）',
    disabledPdfNoData: 'PDF 无法可靠转换为表格/结构化数据',
    recentUsed: '最近使用',
  },

  // Image output parameters
  output: {
    title: '输出参数',
    hint: '仅对图片输出生效，不修改源文件',
    quality: '质量',
    qualityDefault: '默认',
    maxEdge: '最长边',
    edgeOriginal: '原图',
    targetSize: '目标体积',
    sizeNone: '不限制',
    dpi: '清晰度',
    dpiDefault: '默认',
    dpiValue: '{value} DPI',
    percent: '{value}%',
    pixels: '{value} px',
    kilobytes: '{value} KB',
    reset: '恢复默认',
  },

  // Conversion presets
  preset: {
    title: '转换预设',
    empty: '还没有预设：选好目标格式（以及图片输出参数）后存成一键卡片，下次直接套用。',
    namePlaceholder: '预设名称（可留空）',
    save: '保存为预设',
    needTarget: '请先选择目标格式',
    remove: '删除预设 {name}',
    saved: '已保存预设「{name}」',
    removed: '已删除预设「{name}」',
    pending: '已记住预设，上传匹配文件后自动应用',
    unavailable: '当前文件无法转换为该预设的目标格式',
    limit: '预设数量已达上限（{max}）',
  },

  // Conversion
  convert: {
    start: '开始转换',
    startMulti: '开始转换 ({count} 个文件)',
    converting: '转换中 ({done}/{total})...',
    cancelling: '正在取消...',
    cancel: '取消转换',
    inProgress: '正在转换中，请稍候...',
    currentFile: '正在处理: {name}',
    reconvert: '重新转换',
    undo: '撤销',
    undone: '已撤销最近一次结果',
    undoUnavailable: '没有可撤销的结果',
    shortcutHint: '快捷键 {shortcut}',
    // F15 — pre-conversion confirmation
    confirmTitle: '确认开始转换？',
    confirmSummary: '即将转换 {count} 个文件（共 {size}）至 {target} 格式。',
    confirmSummaryMultiStep:
      '即将转换 {count} 个文件（共 {size}）至 {target} 格式。\n部分文件需要多步转换，可能耗时较久。',
    confirmOk: '继续转换',
    confirmCancel: '取消',
    confirmDontAsk: '下次不再询问',
    confirmCancelled: '已取消本次转换',
  },

  // Result / download
  result: {
    doneSingle: '转换完成！',
    doneMulti: '转换完成！共 {count} 个文件',
    donePartial: '完成 {ok} 个，失败 {fail} 个',
    doneNone: '转换失败',
    cancelledPartial: '转换已取消，已完成 {done} / {total} 个文件',
    cancelledNone: '转换已取消，未转换任何文件',
    download: '下载文件',
    downloadZip: '打包下载 ZIP ({count})',
    preview: '预览',
    copy: '复制',
    copyUnavailable: '当前结果为非文本格式，无法复制',
    pdfNoTextLayer:
      '转出的 PDF 是逐页位图，不含文字层；需要图中的文字时，可在 PDF 查看器里试试选中复制——部分查看器会自行识别，这一步不由本扩展完成。',
    // F19 — failure diagnostic panel
    failureSummary: '{file} 转换失败',
    expandDetails: '查看诊断详情',
    collapseDetails: '收起诊断详情',
    failurePath: '转换路径',
    failureAtStep: '失败步骤',
    failureCause: '底层错误',
    failureStepOf: '第 {current} / {total} 步',
    copyDiagnostic: '复制诊断信息',
    diagnosticCopied: '诊断信息已复制',
    diagnosticCopyFail: '复制失败，请手动选择文本',
  },

  // History
  history: {
    title: '转换历史',
    empty: '暂无转换记录',
    reuse: '复用此格式',
    reuseUnavailable: '当前文件无法转换为该格式',
    reusePending: '已记住目标格式，上传匹配文件后自动应用',
    clear: '清空历史',
    clearConfirm: '确定要清空所有转换历史吗？清空后 5 秒内可以撤销。',
    delete: '删除',
    undo: '撤销',
    removed: '已删除 {count} 条历史记录',
    restored: '已恢复 {count} 条历史记录',
    trend: '大小趋势',
    searchPlaceholder: '按文件名搜索',
    filterAll: '全部',
    filterSource: '源格式',
    filterTarget: '目标格式',
    noMatch: '没有匹配的记录',
    // F5 — export / import
    export: '导出历史',
    import: '导入历史',
    exportEmpty: '暂无历史可导出',
    exportSuccess: '已导出 {count} 条记录',
    importSuccess: '已合并 {count} 条记录',
    importConfirm: '导入将与当前历史按 ID 合并（重复 ID 会被新数据覆盖）。继续？',
    importInvalid: '文件格式无效，请选择由本扩展导出的历史 JSON',
    importErrPayload: '文件内容不是有效的历史数据',
    importErrVersion: '历史文件版本不匹配，请选择由当前版本导出的 JSON',
    importErrRecords: '文件中未找到历史记录列表',
    importFailed: '导入失败：{error}',
  },

  // Preferences
  prefs: {
    theme: '主题色',
    language: '界面语言',
    mode: '显示模式',
    modeLight: '亮色',
    modeDark: '暗色',
    modeSystem: '跟随系统',
    notifyOnComplete: '转换完成后发送桌面通知',
    confirmConvert: '大批量转换前显示确认对话框',
    shortcutsTitle: '快捷键',
    shortcutAction: {
      convert: '开始转换',
    },
    shortcutChange: '修改',
    shortcutReset: '重置',
    shortcutRecording: '请按下新的快捷键（Esc 取消）',
    shortcutInvalid: '快捷键无效，请使用包含修饰键的组合',
    shortcutReserved: '该快捷键已被浏览器或扩展占用，无法使用',
    shortcutError: '无法保存快捷键',
    shortcutResetDone: '已恢复默认快捷键',
    notifyGranted: '已开启',
    notifyDenied: '浏览器已拒绝通知权限，请到站点设置中开启',
    notifyUnsupported: '当前环境不支持通知',
    notificationTitle: '转换完成',
    notificationBodyAllOk: '{count} 个文件已成功转换',
    notificationBodyPartial: '{ok} 个成功，{fail} 个失败',
    notificationBodyAllFail: '全部 {count} 个文件转换失败',
    themeNames: {
      blue: '经典蓝',
      green: '森林绿',
      purple: '梦幻紫',
      orange: '活力橙',
      rose: '玫瑰红',
      slate: '石墨灰',
    },
  },

  // Errors (mapped from conversion error codes)
  errors: {
    noFileOrTarget: '请先选择文件和目标格式',
    noPath: '找不到可用的转换路径',
    unknown: '转换过程中发生未知错误',
    unknownFormat: '无法识别文件格式',
    docxParse: 'DOCX 解析失败，文件可能已损坏',
    docxGen: 'DOCX 生成失败',
    docxEmpty: 'DOCX 文档内容为空，无法转换',
    pdfParse: 'PDF 解析失败，文件可能已损坏',
    xlsxEmpty: 'XLSX 文件中没有工作表',
    csvDecode: 'CSV 解码失败，请检查文件编码',
    imageDecode: '图片解码失败，文件可能已损坏',
    imageEncode: '图片编码失败，浏览器不支持该输出格式',
    renderTimeout: '文档渲染超时，请尝试简化该文档（如减少图片或复杂样式）',
    renderFailed: '文档渲染失败，文件内容可能不受浏览器支持',
    zipFail: 'ZIP 打包失败',
    jsonParse: 'JSON 解析失败，请检查文件格式',
    jsonNotArray: 'JSON 内容必须是对象数组才能转换为 CSV',
    htmlToJson: '无法从 HTML 中提取有效的 JSON 数据',
    decodeFail: '文件解码失败，编码可能不受支持或文件已损坏',
    cancelled: '转换已取消',
  },

  // F10 — accessibility (ARIA labels & live-region messages)
  a11y: {
    skipToContent: '跳到主内容',
    // Icon-only buttons (overrides bare :title for screen readers)
    delete: '删除',
    remove: '移除',
    preview: '预览',
    copy: '复制',
    download: '下载',
    import: '导入',
    // Toggle buttons (aria-pressed)
    theme: '主题色：{name}',
    language: '界面语言：{name}',
    mode: '显示模式：{name}',
    // Comparison view modes
    sourceOnly: '仅显示原文件',
    splitView: '并排视图',
    resultOnly: '仅显示结果',
    splitDivider: '调整原文件与结果的分栏宽度',
    // Live region announcements
    converting: '正在转换第 {current} 个，共 {total} 个',
    convertCompleted: '转换完成：成功 {ok} 个，失败 {fail} 个',
    convertAllOk: '全部 {count} 个文件转换成功',
    convertAllFail: '全部 {count} 个文件转换失败',
    convertCancelled: '转换已取消',
    convertCancelledPartial: '转换已取消：已完成 {done} / {total} 个文件',
    filesLoaded: '已载入 {count} 个文件',
    filesCleared: '已清空文件列表',
    // Accessible names for controls with no visible label (el-select, etc.)
    targetFormat: '目标格式',
    historyFormatFilter: '按格式筛选历史记录',
  },

  // Footer
  footer: {
    stats: '支持 {formats} 种格式，{paths}+ 转换路径',
  },
};
