import { inflateRawSync } from "node:zlib";

type ZipEntry = {
  name: string;
  data: Buffer;
};

export type SheetRows = {
  sheetName: string;
  rows: string[][];
};

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function localNamePattern(tagName: string) {
  return `(?:[A-Za-z_][\\w.-]*:)?${tagName}`;
}

function tagRegex(tagName: string, flags = "g") {
  const localName = localNamePattern(tagName);

  return new RegExp(`<${localName}\\b([^>]*)>([\\s\\S]*?)</${localName}>`, flags);
}

function selfClosingTagRegex(tagName: string, flags = "g") {
  return new RegExp(`<${localNamePattern(tagName)}\\b([^>]*)\\/>`, flags);
}

function readXmlAttribute(attributes: string, attributeName: string) {
  const localAttributeName = localNamePattern(attributeName);
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${localAttributeName}="([^"]*)"`, "i"),
  );

  return match ? decodeXml(match[1]) : undefined;
}

function normalizeWorkbookTarget(target: string) {
  const normalized = target.replace(/\\/g, "/").replace(/^\/+/, "");

  if (normalized.startsWith("xl/")) {
    return normalized;
  }

  return `xl/${normalized}`;
}

function columnIndex(cellReference: string) {
  const letters = cellReference.replace(/[0-9]/g, "").toUpperCase();

  return letters.split("").reduce((index, letter) => {
    return index * 26 + letter.charCodeAt(0) - 64;
  }, 0) - 1;
}

function decimalStringToIndex(value: string) {
  if (!/^[0-9]+$/.test(value)) {
    return -1;
  }

  return value.split("").reduce((total, digit) => total * 10 + digit.charCodeAt(0) - 48, 0);
}

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, ZipEntry>();
  let eocdOffset = -1;

  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (readUInt32(buffer, index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Invalid .xlsx file: ZIP directory not found.");
  }

  const centralDirectorySize = readUInt32(buffer, eocdOffset + 12);
  const centralDirectoryOffset = readUInt32(buffer, eocdOffset + 16);
  let offset = centralDirectoryOffset;
  const endOffset = centralDirectoryOffset + centralDirectorySize;

  while (offset < endOffset) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error("Invalid .xlsx file: ZIP central directory is unreadable.");
    }

    const method = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    const localFileNameLength = readUInt16(buffer, localHeaderOffset + 26);
    const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
    const data =
      method === 0
        ? compressedData
        : method === 8
          ? inflateRawSync(compressedData)
          : undefined;

    if (!data) {
      throw new Error(`Unsupported .xlsx compression method for ${name}.`);
    }

    entries.set(name, { name, data });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function textFromXmlTag(xml: string, tagName: string) {
  const match = tagRegex(tagName, "").exec(xml);

  return match ? decodeXml(match[2]) : "";
}

function parseSharedStrings(xml?: string) {
  if (!xml) {
    return [];
  }

  const values: string[] = [];
  const itemMatches = xml.matchAll(tagRegex("si"));

  for (const item of itemMatches) {
    const textParts = Array.from(item[2].matchAll(tagRegex("t"))).map(
      (textMatch) => decodeXml(textMatch[2]),
    );

    values.push(textParts.join(""));
  }

  return values;
}

function parseWorkbookSheets(workbookXml: string, relsXml: string) {
  const relationships = new Map<string, string>();

  for (const rel of relsXml.matchAll(selfClosingTagRegex("Relationship"))) {
    const id = readXmlAttribute(rel[1], "Id");
    const target = readXmlAttribute(rel[1], "Target");

    if (id && target) {
      relationships.set(id, normalizeWorkbookTarget(target));
    }
  }

  return Array.from(workbookXml.matchAll(selfClosingTagRegex("sheet"))).map((sheet) => {
    const name = readXmlAttribute(sheet[1], "name") ?? "";
    const relationshipId = readXmlAttribute(sheet[1], "id") ?? "";

    return {
      name,
      path: relationships.get(relationshipId),
    };
  });
}

function parseSheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(tagRegex("row"))) {
    const row: string[] = [];

    for (const cellMatch of rowMatch[2].matchAll(tagRegex("c"))) {
      const attributes = cellMatch[1];
      const cellXml = cellMatch[2];
      const reference = readXmlAttribute(attributes, "r") ?? "";
      const type = readXmlAttribute(attributes, "t");
      const value = textFromXmlTag(cellXml, "v");
      const inlineValue = textFromXmlTag(cellXml, "t");
      const index = reference ? columnIndex(reference) : row.length;
      const sharedStringIndex = decimalStringToIndex(value);
      const resolvedValue =
        type === "s"
          ? sharedStrings[sharedStringIndex] ?? ""
          : type === "inlineStr"
            ? inlineValue
            : value;

      row[index] = resolvedValue.trim();
    }

    rows.push(row.map((cell) => cell ?? ""));
  }

  return rows;
}

export function readXlsxSheets(buffer: Buffer): SheetRows[] {
  if (buffer.subarray(0, 2).toString("utf8") !== "PK") {
    throw new Error("Invalid .xlsx file: file signature is not ZIP.");
  }

  const entries = readZipEntries(buffer);
  const workbook = entries.get("xl/workbook.xml")?.data.toString("utf8");
  const rels = entries.get("xl/_rels/workbook.xml.rels")?.data.toString("utf8");

  if (!workbook || !rels) {
    throw new Error("Invalid .xlsx file: workbook metadata not found.");
  }

  const sharedStrings = parseSharedStrings(
    entries.get("xl/sharedStrings.xml")?.data.toString("utf8"),
  );

  return parseWorkbookSheets(workbook, rels)
    .map((sheet) => {
      if (!sheet.path) {
        return undefined;
      }

      const sheetXml = entries.get(sheet.path)?.data.toString("utf8");

      if (!sheetXml) {
        return undefined;
      }

      return {
        sheetName: sheet.name,
        rows: parseSheetRows(sheetXml, sharedStrings),
      };
    })
    .filter((sheet): sheet is SheetRows => Boolean(sheet));
}
