import { converterRegistry } from '~/utils/core/registry';
import mdToHtmlConverter from '~/utils/converters/md-to-html';
import htmlToMdConverter from '~/utils/converters/html-to-md';
import csvToXlsxConverter from '~/utils/converters/csv-to-xlsx';
import xlsxToCsvConverter from '~/utils/converters/xlsx-to-csv';
import imageConverters from '~/utils/converters/image-convert';
import textFormatConverters from '~/utils/converters/text-formats';
import docxToHtmlConverter from '~/utils/converters/docx-to-html';
import htmlToDocxConverter from '~/utils/converters/html-to-docx';
import { csvToHtmlConverter, xlsxToHtmlConverter } from '~/utils/converters/data-to-html';
import htmlToPdfConverter from '~/utils/converters/html-to-pdf';
import pdfToHtmlConverter from '~/utils/converters/pdf-to-html';
import pdfToPngConverter from '~/utils/converters/pdf-to-image';
import { htmlToPngConverter } from '~/utils/converters/html-to-png';
import { pngToPdfConverter } from '~/utils/converters/png-to-pdf';
import imageToHtmlConverter from '~/utils/converters/image-to-html';
import { imageToHtmlConverters } from '~/utils/converters/image-to-html';
import { imageToPdfConverters } from '~/utils/converters/image-to-pdf';
import { jsonToHtmlConverter, htmlToJsonConverter } from '~/utils/converters/json-to-html';
import { jsonToCsvConverter, csvToJsonConverter } from '~/utils/converters/json-to-csv';
import xlsxToJsonConverter from '~/utils/converters/xlsx-to-json';
import { svgRasterConverters } from '~/utils/converters/svg-rasterize';
import svgToHtmlConverter from '~/utils/converters/svg-to-html';

let convertersInitialized = false;

/** Register all available converters. Call once at app startup. */
export function initConverters(): void {
  if (convertersInitialized) return;
  convertersInitialized = true;
  // Markdown <-> HTML
  converterRegistry.register(mdToHtmlConverter);
  converterRegistry.register(htmlToMdConverter);

  // DOCX <-> HTML
  converterRegistry.register(docxToHtmlConverter);
  converterRegistry.register(htmlToDocxConverter);

  // HTML <-> PDF
  converterRegistry.register(htmlToPdfConverter);
  converterRegistry.register(pdfToHtmlConverter);

  // PDF -> PNG (JPG/WEBP/BMP/GIF-SVG targets then reachable via image graph)
  converterRegistry.register(pdfToPngConverter);

  // CSV <-> XLSX
  converterRegistry.register(csvToXlsxConverter);
  converterRegistry.register(xlsxToCsvConverter);

  // JSON <-> HTML / CSV (connect JSON to both document and data clusters)
  converterRegistry.register(jsonToHtmlConverter);
  converterRegistry.register(htmlToJsonConverter);
  converterRegistry.register(jsonToCsvConverter);
  converterRegistry.register(csvToJsonConverter);
  converterRegistry.register(xlsxToJsonConverter);

  // CSV/XLSX → HTML bridges (connect the data cluster to document formats)
  converterRegistry.register(csvToHtmlConverter);
  converterRegistry.register(xlsxToHtmlConverter);

  // Image format converters (PNG, JPG, WEBP, BMP)
  for (const converter of imageConverters) {
    converterRegistry.register(converter);
  }

  // Text format converters (TXT->HTML, TXT->MD, HTML->TXT)
  for (const converter of textFormatConverters) {
    converterRegistry.register(converter);
  }

  // Bridge converters (connect document/image clusters)
  converterRegistry.register(htmlToPngConverter);
  converterRegistry.register(pngToPdfConverter);
  converterRegistry.register(imageToHtmlConverter);

  // Direct image-to-HTML bridges for all image formats
  for (const converter of imageToHtmlConverters) {
    converterRegistry.register(converter);
  }

  // Direct image-to-PDF bridges for all image formats
  for (const converter of imageToPdfConverters) {
    converterRegistry.register(converter);
  }

  // SVG sources: raster targets plus an HTML bridge (other document formats
  // are then reachable through multi-step paths)
  for (const converter of svgRasterConverters) {
    converterRegistry.register(converter);
  }
  converterRegistry.register(svgToHtmlConverter);
}
