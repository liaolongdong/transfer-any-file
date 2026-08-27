import type zh from '~/utils/i18n/zh';

const en: typeof zh = {
  common: {
    close: 'Close',
  },

  appName: 'File Any Transfer',
  appTagline: 'Local file format converter',

  options: {
    title: 'Conversion Workbench',
    subtitle: 'Batch convert, preview and edit — all locally',
    history: 'History',
    preferences: 'Preferences',
  },

  upload: {
    drop: 'Drop files here, or click to select',
    replace: 'Click or drag to replace files',
    pasteHint: 'You can also paste an image or text with {key}',
    selectedCount: '{count} file(s) selected',
    unknownFormat: 'Unknown format',
    tooLarge: 'File "{name}" exceeds 100MB and cannot be processed',
    largeWarning: 'File "{name}" is large ({size}), conversion may be slow',
  },

  preview: {
    fileTitle: 'File Preview',
    resultTitle: 'Result Preview',
    reading: 'Reading...',
    truncated: '(content truncated)',
    readFileFail: 'Failed to read file content',
    readResultFail: 'Failed to read result content',
    resultPlaceholder: 'Result content',
    renderedTab: 'Preview',
    sourceTab: 'Source',
    copy: 'Copy',
    copied: 'Copied to clipboard',
    fileName: 'Name',
    size: 'Size',
    format: 'Format',
    docxHint: 'File size: {size}. Please download and open with Word.',
    fileSize: 'File size: {size}',
    openPreview: 'Preview',
    dialogTitle: 'File Preview',
    download: 'Download',
    docxPlaceholder: '[DOCX] {filename}\nFile size: {size}\nPlease download and open with Word.',
  },

  format: {
    selectTarget: 'Select target format',
    noTarget: 'No available conversion target for this format',
    mixedSource: '{count} formats',
    categoryDocument: 'Document',
    categoryImage: 'Image',
    categoryData: 'Data',
  },

  convert: {
    start: 'Convert',
    startMulti: 'Convert ({count} files)',
    converting: 'Converting ({done}/{total})...',
    inProgress: 'Converting, please wait...',
    reconvert: 'Convert Again',
  },

  result: {
    doneSingle: 'Conversion complete!',
    doneMulti: 'Conversion complete! {count} files',
    donePartial: '{ok} succeeded, {fail} failed',
    doneNone: 'Conversion failed',
    failed: 'Failed',
    download: 'Download',
    downloadZip: 'Download ZIP ({count})',
    preview: 'Preview',
  },

  history: {
    title: 'Conversion History',
    empty: 'No conversion records yet',
    reuse: 'Reuse this format',
    reuseUnavailable: 'The current files cannot be converted to that format',
    reusePending: 'Target format saved; it will apply after you upload matching files',
    clear: 'Clear History',
    delete: 'Delete',
    filesCount: '{count} file(s)',
  },

  prefs: {
    title: 'Preferences',
    theme: 'Theme Color',
    language: 'Language',
    themeNames: {
      blue: 'Classic Blue',
      green: 'Forest Green',
      purple: 'Dreamy Purple',
      orange: 'Vivid Orange',
      rose: 'Rose Red',
      slate: 'Graphite',
    },
  },

  errors: {
    noFileOrTarget: 'Please select a file and target format first',
    noPath: 'No available conversion path found',
    unknown: 'An unknown error occurred during conversion',
    unknownFormat: 'Unrecognized file format',
    docxParse: 'Failed to parse DOCX; the file may be corrupted',
    docxGen: 'Failed to generate DOCX',
    xlsxEmpty: 'The XLSX file contains no worksheets',
    csvDecode: 'Failed to decode CSV; please check the file encoding',
    imageDecode: 'Failed to decode image; the file may be corrupted',
    imageEncode: 'Failed to encode image; the browser does not support this output format',
    zipFail: 'Failed to create ZIP archive',
  },

  footer: {
    stats: '{formats} formats supported, {paths}+ conversion paths',
  },
};

export default en;
