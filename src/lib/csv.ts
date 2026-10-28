import Papa from "papaparse";

/** The sub-columns a Kinabase location field exports, keyed by the suffix inside the brackets */
export const LOCATION_SUBHEADINGS = {
  Title: "title",
  "Line 1": "line1",
  "Line 2": "line2",
  City: "city",
  County: "county",
  Region: "region",
  Country: "country",
  Postcode: "postcode",
  Latitude: "lat",
  Longitude: "lng"
} as const;

export type SubheadingKey = (typeof LOCATION_SUBHEADINGS)[keyof typeof LOCATION_SUBHEADINGS];

/** Order the parts are joined in when building a search query */
export const QUERY_PART_ORDER: SubheadingKey[] = ["line1", "line2", "city", "county", "region", "postcode", "country"];

export type CsvRow = Record<string, string>;

export interface ParsedCsv {
  fileName: string;
  headers: string[];
  rows: CsvRow[];
}

/** One Kinabase location field found in the export, with the column each part lives in */
export interface LocationFieldGroup {
  /** The field name before the separator, e.g. "address" */
  name: string;
  /** Column header for each sub part that exists in the file */
  columns: Partial<Record<SubheadingKey, string>>;
  /** How this file joins the field name to the part, so added columns match the ones already there */
  style: "bracket" | "chevron";
}

// Kinabase has exported sub-columns two ways: "address (Line 1)" and, more recently, "Address » Line 1"
const SUBHEADING_PATTERNS: { style: LocationFieldGroup["style"]; pattern: RegExp }[] = [
  { style: "bracket", pattern: /^(.*) \((Title|Line 1|Line 2|City|County|Region|Country|Postcode|Latitude|Longitude)\)$/ },
  { style: "chevron", pattern: /^(.*) » (Title|Line 1|Line 2|City|County|Region|Country|Postcode|Latitude|Longitude)$/ }
];

const partHeader = (group: LocationFieldGroup, part: keyof typeof LOCATION_SUBHEADINGS) =>
  group.style === "chevron" ? `${group.name} » ${part}` : `${group.name} (${part})`;

export const parseCsvFile = (file: File): Promise<ParsedCsv> =>
  new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new Error("The file has no header row."));
          return;
        }
        resolve({ fileName: file.name, headers, rows: result.data });
      },
      error: (err) => reject(err)
    });
  });

/** Finds every "<field> (<part>)" column set in the headers and groups them by field */
export const detectLocationFields = (headers: string[]): LocationFieldGroup[] => {
  const groups = new Map<string, LocationFieldGroup>();
  for (const header of headers) {
    for (const { style, pattern } of SUBHEADING_PATTERNS) {
      const match = pattern.exec(header);
      if (!match) continue;
      const [, name, part] = match;
      const key = LOCATION_SUBHEADINGS[part as keyof typeof LOCATION_SUBHEADINGS];
      const group = groups.get(`${style}:${name}`) ?? { name, columns: {}, style };
      group.columns[key] = header;
      groups.set(`${style}:${name}`, group);
      break;
    }
  }
  // Only count a group as an address when it has something searchable in it
  return [...groups.values()].filter((g) => g.columns.line1 || g.columns.city || g.columns.postcode);
};

/** Columns Kinabase adds to every export that never identify a record */
const AUDIT_HEADERS = new Set(["created at", "updated at", "created by", "updated by"]);

/**
 * Headers that could identify a record when the file is imported back with "Update matching records":
 * anything that is not part of a location field and not an audit column. An ID-like header comes first.
 */
export const identifyingHeaders = (headers: string[], groups: LocationFieldGroup[]) => {
  const locationHeaders = new Set(groups.flatMap((g) => Object.values(g.columns)));
  const candidates = headers.filter((h) => !locationHeaders.has(h) && !AUDIT_HEADERS.has(h.trim().toLowerCase()));
  const rank = (h: string) => {
    const key = h.trim().toLowerCase();
    if (key === "id" || key === "record id" || key.endsWith(" id")) return 0;
    if (key === "name" || key.endsWith(" name")) return 1;
    return 2;
  };
  return [...candidates].sort((a, b) => rank(a) - rank(b));
};

export const latitudeHeader = (group: LocationFieldGroup) => group.columns.lat ?? partHeader(group, "Latitude");
export const longitudeHeader = (group: LocationFieldGroup) => group.columns.lng ?? partHeader(group, "Longitude");

/** Header for an extra diagnostic column, in the file's own style */
export const extraHeader = (group: LocationFieldGroup, label: string) => (group.style === "chevron" ? `${group.name} » ${label}` : `${group.name} (${label})`);

const clean = (value: string | undefined) => value?.trim() ?? "";

export interface AddressParts {
  title: string;
  parts: string[];
  country: string;
  postcode: string;
  /** Whether the row names a town or postcode; a bare street can match the same-named street in any town */
  hasLocality: boolean;
}

/** Pulls the searchable text out of a row for one location field */
export const extractAddress = (row: CsvRow, group: LocationFieldGroup): AddressParts => {
  const parts = QUERY_PART_ORDER.map((key) => {
    const column = group.columns[key];
    return column ? clean(row[column]) : "";
  }).filter(Boolean);
  const title = group.columns.title ? clean(row[group.columns.title]) : "";
  const country = group.columns.country ? clean(row[group.columns.country]) : "";
  const postcode = group.columns.postcode ? clean(row[group.columns.postcode]) : "";
  const city = group.columns.city ? clean(row[group.columns.city]) : "";
  return { title, parts, country, postcode, hasLocality: !!postcode || !!city };
};

const isNumber = (value: string | undefined) => value !== undefined && value.trim() !== "" && Number.isFinite(Number(value));

export const hasCoordinates = (row: CsvRow, group: LocationFieldGroup) =>
  !!group.columns.lat && !!group.columns.lng && isNumber(row[group.columns.lat]) && isNumber(row[group.columns.lng]);

/** Builds a CSV string with the given header order, keeping values that aren't in the header list out */
export const toCsv = (headers: string[], rows: CsvRow[]) => Papa.unparse({ fields: headers, data: rows.map((row) => headers.map((h) => row[h] ?? "")) });

/** Inserts new headers right after an anchor column so the lat/lng columns sit beside the address */
export const insertHeadersAfter = (headers: string[], anchor: string | undefined, toInsert: string[]) => {
  const missing = toInsert.filter((h) => !headers.includes(h));
  if (missing.length === 0) return headers;
  const index = anchor ? headers.indexOf(anchor) : -1;
  if (index === -1) return [...headers, ...missing];
  return [...headers.slice(0, index + 1), ...missing, ...headers.slice(index + 1)];
};

export const downloadText = (fileName: string, text: string) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
