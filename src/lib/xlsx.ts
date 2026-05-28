type CellValue = string | number | boolean | null | undefined;

export interface WorkbookSheet {
  name: string;
  rows: CellValue[][];
}

const encoder = new TextEncoder();

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < CRC_TABLE.length; i++) {
  let value = i;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[i] = value >>> 0;
}

function encodeText(value: string): Uint8Array {
  return encoder.encode(value);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
  let current = index + 1;
  let name = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function sanitizeSheetName(name: string): string {
  const clean = name.replace(/[[\]*?/\\:]/g, " ").trim();
  return (clean || "Sheet").slice(0, 31);
}

function cellXml(value: CellValue, rowIndex: number, columnIndex: number): string {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`;

  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}"/>`;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? `<c r="${ref}"><v>${value}</v></c>` : `<c r="${ref}"/>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function worksheetXml(rows: CellValue[][]): string {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row.map((cell, columnIndex) => cellXml(cell, rowIndex, columnIndex)).join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${body}</sheetData>
</worksheet>`;
}

function workbookXml(sheets: WorkbookSheet[]): string {
  const sheetXml = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sanitizeSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
}

function workbookRelsXml(sheets: WorkbookSheet[]): string {
  const sheetRels = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypesXml(sheets: WorkbookSheet[]): string {
  const overrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
}

interface ZipEntry {
  name: string;
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

function pushUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function pushBytes(bytes: number[], value: Uint8Array) {
  for (const byte of value) bytes.push(byte);
}

function buildZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const entries: ZipEntry[] = [];
  const output: number[] = [];

  for (const file of files) {
    const nameBytes = encodeText(file.name);
    const entry: ZipEntry = {
      name: file.name,
      nameBytes,
      data: file.data,
      crc: crc32(file.data),
      offset: output.length,
    };
    entries.push(entry);

    pushUint32(output, 0x04034b50);
    pushUint16(output, 20);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint32(output, entry.crc);
    pushUint32(output, entry.data.length);
    pushUint32(output, entry.data.length);
    pushUint16(output, entry.nameBytes.length);
    pushUint16(output, 0);
    pushBytes(output, entry.nameBytes);
    pushBytes(output, entry.data);
  }

  const centralDirectoryOffset = output.length;

  for (const entry of entries) {
    pushUint32(output, 0x02014b50);
    pushUint16(output, 20);
    pushUint16(output, 20);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint32(output, entry.crc);
    pushUint32(output, entry.data.length);
    pushUint32(output, entry.data.length);
    pushUint16(output, entry.nameBytes.length);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint16(output, 0);
    pushUint32(output, 0);
    pushUint32(output, entry.offset);
    pushBytes(output, entry.nameBytes);
  }

  const centralDirectorySize = output.length - centralDirectoryOffset;

  pushUint32(output, 0x06054b50);
  pushUint16(output, 0);
  pushUint16(output, 0);
  pushUint16(output, entries.length);
  pushUint16(output, entries.length);
  pushUint32(output, centralDirectorySize);
  pushUint32(output, centralDirectoryOffset);
  pushUint16(output, 0);

  return new Uint8Array(output);
}

export function createXlsxWorkbook(sheets: WorkbookSheet[]): Uint8Array {
  const safeSheets = sheets.length > 0 ? sheets : [{ name: "Sheet1", rows: [] }];
  const files = [
    { name: "[Content_Types].xml", data: encodeText(contentTypesXml(safeSheets)) },
    { name: "_rels/.rels", data: encodeText(rootRelsXml()) },
    { name: "xl/workbook.xml", data: encodeText(workbookXml(safeSheets)) },
    { name: "xl/_rels/workbook.xml.rels", data: encodeText(workbookRelsXml(safeSheets)) },
    { name: "xl/styles.xml", data: encodeText(stylesXml()) },
    ...safeSheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: encodeText(worksheetXml(sheet.rows)),
    })),
  ];

  return buildZip(files);
}
