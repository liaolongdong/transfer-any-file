export default {
  // Common
  common: {
    close: '关闭',
  },

  // App / brand
  appName: 'File Any Transfer',
  appTagline: '本地文件格式转换工具',

  // Options / workbench
  options: {
    title: '转换工作台',
    subtitle: '批量转换、预览与编辑，全部在本地完成',
    history: '转换历史',
    preferences: '偏好设置',
  },

  // Upload
  upload: {
    drop: '拖拽文件到此处，或点击选择文件',
    replace: '点击或拖拽以替换文件',
    pasteHint: '也可以直接 {key} 粘贴图片或文本',
    selectedCount: '已选择 {count} 个文件',
    unknownFormat: '未知格式',
    tooLarge: '文件 "{name}" 超过 100MB，无法处理',
    largeWarning: '文件 "{name}" 较大（{size}），转换可能较慢',
    zipExtracted: '已从 "{name}" 解出 {count} 个可转换文件',
    zipNoFiles: '"{name}" 中没有可转换的文件',
    zipReadFail: '无法读取压缩包 "{name}"，文件可能已损坏',
    addMore: '追加文件',
    clearAll: '清空',
    batchCap: '一次最多处理 {max} 个文件，超出部分已忽略',
  },

  // Preview
  preview: {
    fileTitle: '文件预览',
    resultTitle: '结果预览',
    reading: '读取中...',
    truncated: '(内容已截断)',
    readFileFail: '无法读取文件内容',
    readResultFail: '无法读取结果内容',
    resultPlaceholder: '结果内容',
    renderedTab: '预览',
    sourceTab: '源码',
    copy: '复制',
    copied: '已复制到剪贴板',
    fileName: '文件名',
    size: '大小',
    format: '格式',
    docxHint: '文件大小: {size}，请下载后用 Word 打开查看。',
    xlsxHint: '文件大小: {size}，请下载后用 Excel 打开查看。',
    fileSize: '文件大小: {size}',
    openPreview: '预览',
    dialogTitle: '文件预览',
    download: '下载',
    docxPlaceholder: '[DOCX] {filename}\n文件大小: {size}\n请下载后用 Word 打开。',
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
    collapse: '收起',
    expand: '展开',
    sourceOnly: '仅显示原文件',
    splitView: '并排视图',
    resultOnly: '仅显示结果',
  },

  // Format selector
  format: {
    selectTarget: '请选择目标格式',
    noTarget: '当前格式没有可用的转换目标',
    mixedSource: '{count} 种格式',
    categoryDocument: '文档',
    categoryImage: '图片',
    categoryData: '数据',
    conversionPath: '转换路径:',
  },

  // Conversion
  convert: {
    start: '开始转换',
    startMulti: '开始转换 ({count} 个文件)',
    converting: '转换中 ({done}/{total})...',
    cancelling: '正在取消...',
    cancel: '取消转换',
    inProgress: '正在转换中，请稍候...',
    reconvert: '重新转换',
    shortcutHint: '快捷键 Ctrl/⌘ + Enter',
  },

  // Result / download
  result: {
    doneSingle: '转换完成！',
    doneMulti: '转换完成！共 {count} 个文件',
    donePartial: '完成 {ok} 个，失败 {fail} 个',
    doneNone: '转换失败',
    failed: '失败',
    download: '下载文件',
    downloadZip: '打包下载 ZIP ({count})',
    preview: '预览',
  },

  // History
  history: {
    title: '转换历史',
    empty: '暂无转换记录',
    reuse: '复用此格式',
    reuseUnavailable: '当前文件无法转换为该格式',
    reusePending: '已记住目标格式，上传匹配文件后自动应用',
    clear: '清空历史',
    clearConfirm: '确定要清空所有转换历史吗？此操作不可撤销。',
    delete: '删除',
    filesCount: '{count} 个文件',
  },

  // Preferences
  prefs: {
    title: '偏好设置',
    theme: '主题色',
    language: '界面语言',
    mode: '显示模式',
    modeLight: '亮色',
    modeDark: '暗色',
    modeSystem: '跟随系统',
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
    xlsxEmpty: 'XLSX 文件中没有工作表',
    csvDecode: 'CSV 解码失败，请检查文件编码',
    imageDecode: '图片解码失败，文件可能已损坏',
    imageEncode: '图片编码失败，浏览器不支持该输出格式',
    zipFail: 'ZIP 打包失败',
    jsonParse: 'JSON 解析失败，请检查文件格式',
    jsonNotArray: 'JSON 内容必须是对象数组才能转换为 CSV',
    htmlToJson: '无法从 HTML 中提取有效的 JSON 数据',
  },

  // Footer
  footer: {
    stats: '支持 {formats} 种格式，{paths}+ 转换路径',
  },
};
