import { computed, reactive, ref, shallowRef, watch } from "vue";

import {
  detectLocationFields,
  extraHeader,
  extractAddress,
  hasCoordinates,
  identifyingHeaders,
  insertHeadersAfter,
  latitudeHeader,
  longitudeHeader,
  parseCsvFile,
  toCsv,
  downloadText
} from "./csv";
import { DEFAULT_HERE_API_KEY, GeocodeError, geocode, runWithConcurrency, suggestCountry } from "./geocode";

import type { AddressParts, CsvRow, LocationFieldGroup, ParsedCsv } from "./csv";
import type { GeocodeHit } from "./geocode";

/**
 * What happened to a row, in the words the page uses:
 * placed = the exact address was found; approx = only the postcode or street was found, so the pin is
 * close but not on the door; check = the result is doubtful and someone should look; none = nothing found
 */
export type RowStatus = "pending" | "skipped" | "placed" | "approx" | "check" | "none" | "error";

export interface RowResult {
  index: number;
  query: string;
  status: RowStatus;
  hit?: GeocodeHit;
  /** Plain-English explanation of the status, shown beside the result */
  reason?: string;
}

export interface GeocoderSettings {
  apiKey: string;
  countryCode: string;
  includeTitle: boolean;
  overwriteExisting: boolean;
  /** Put approximate (postcode or street level) pins in the download */
  includeApprox: boolean;
  /** Put doubtful pins in the download too */
  includeCheck: boolean;
  includeDiagnostics: boolean;
}

type GeocodeSettingsStored = Partial<GeocoderSettings>;

const STORAGE_KEY = "geocoder:settings";
const CONCURRENCY = 4;
/** Below this HERE score a result is doubtful whatever its granularity */
const DOUBTFUL_SCORE = 0.6;
/** Below this an exact-looking result is still only "close" */
const CONFIDENT_SCORE = 0.8;
/** Result granularities that mean HERE only found the town, not the address */
const COARSE_RESULT_TYPES = new Set(["locality", "administrativeArea"]);
/** Granularities that land near the address without pinpointing the building */
const APPROX_RESULT_TYPES = new Set(["postalCodePoint", "street", "intersection"]);

const loadSettings = (): GeocoderSettings => {
  const defaults: GeocoderSettings = {
    apiKey: DEFAULT_HERE_API_KEY,
    countryCode: "",
    includeTitle: false,
    overwriteExisting: false,
    includeApprox: true,
    includeCheck: false,
    includeDiagnostics: false
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;
    const merged = { ...defaults, ...(JSON.parse(saved) as Partial<GeocodeSettingsStored>) };
    // A cleared key falls back to the built-in one rather than leaving the tool unable to run
    if (!merged.apiKey.trim()) merged.apiKey = DEFAULT_HERE_API_KEY;
    return merged;
  } catch {
    return defaults;
  }
};

export const useGeocoder = () => {
  const settings = reactive<GeocoderSettings>(loadSettings());
  watch(settings, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Private mode or blocked storage: settings just don't persist
    }
  });

  const file = shallowRef<ParsedCsv>();
  const groups = shallowRef<LocationFieldGroup[]>([]);
  const selectedGroupName = ref<string>();
  const results = ref<RowResult[]>([]);
  const running = ref(false);
  const downloaded = ref(false);
  const fatalError = ref<string>();
  const loadError = ref<string>();
  let controller: AbortController | undefined;

  const selectedGroup = computed(() => groups.value.find((g) => g.name === selectedGroupName.value));

  /** Columns the import could match records on; empty means the file can only be imported as new records */
  const matchColumns = computed(() => (file.value ? identifyingHeaders(file.value.headers, groups.value) : []));
  const suggestedMatchColumn = computed(() => matchColumns.value[0]);

  const load = async (picked: File) => {
    loadError.value = undefined;
    fatalError.value = undefined;
    results.value = [];
    downloaded.value = false;
    try {
      const parsed = await parseCsvFile(picked);
      const found = detectLocationFields(parsed.headers);
      if (found.length === 0) {
        loadError.value =
          'No address columns found. The file needs Kinabase address columns such as "Address » Line 1", "Address » City" and "Address » Postcode" (older exports use "address (Line 1)").';
        file.value = undefined;
        groups.value = [];
        return;
      }
      file.value = parsed;
      groups.value = found;
      selectedGroupName.value = found[0].name;
      const countryColumn = found[0].columns.country;
      settings.countryCode = countryColumn ? suggestCountry(parsed.rows.map((r) => r[countryColumn] ?? "")) : settings.countryCode;
      prepare();
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : "The file could not be read.";
    }
  };

  const buildQuery = (row: CsvRow, group: LocationFieldGroup) => {
    const address = extractAddress(row, group);
    const parts = settings.includeTitle && address.title ? [address.title, ...address.parts] : address.parts;
    return parts.join(", ");
  };

  /** Works out which rows will be searched before anything runs, so the summary is honest up front */
  const prepare = () => {
    const parsed = file.value;
    const group = selectedGroup.value;
    if (!parsed || !group) return;
    results.value = parsed.rows.map((row, index) => {
      const query = buildQuery(row, group);
      if (!query) return { index, query, status: "skipped", reason: "No address in this row" };
      if (!settings.overwriteExisting && hasCoordinates(row, group)) return { index, query, status: "skipped", reason: "Already has a pin" };
      return { index, query, status: "pending" };
    });
  };

  watch([selectedGroupName, () => settings.includeTitle, () => settings.overwriteExisting], () => {
    if (!running.value) prepare();
  });

  const classify = (hit: GeocodeHit | undefined, address: AddressParts): Pick<RowResult, "status" | "reason"> => {
    if (!hit) return { status: "none", reason: "Nothing found. Check the spelling and postcode" };
    if (hit.score < DOUBTFUL_SCORE) return { status: "check", reason: "Only a loose match. Make sure this is the right place" };
    // A street with no town or postcode matches the same-named street in whichever town HERE picks
    if (!address.hasLocality) return { status: "check", reason: "No town or postcode in the row, so this could be the wrong town" };
    if (COARSE_RESULT_TYPES.has(hit.resultType)) return { status: "check", reason: "Only the town was found, not the address" };
    if (hit.resultType === "postalCodePoint") return { status: "approx", reason: "Pin is on the postcode, not the exact building" };
    if (APPROX_RESULT_TYPES.has(hit.resultType)) return { status: "approx", reason: "Pin is on the street, not the exact building" };
    if (hit.score < CONFIDENT_SCORE) return { status: "approx", reason: "Close match. Some of the address didn't line up exactly" };
    return { status: "placed", reason: "Exact address found" };
  };

  const runRows = async (targets: RowResult[]) => {
    const parsed = file.value;
    const group = selectedGroup.value;
    if (!parsed || !group || targets.length === 0) return;
    if (!settings.apiKey.trim()) {
      fatalError.value = "Add a HERE API key in settings before running.";
      return;
    }
    fatalError.value = undefined;
    downloaded.value = false;
    running.value = true;
    controller = new AbortController();
    const signal = controller.signal;

    for (const target of targets) {
      target.status = "pending";
      target.reason = undefined;
    }

    try {
      await runWithConcurrency(
        targets,
        CONCURRENCY,
        async (target) => {
          const row = parsed.rows[target.index];
          const address = extractAddress(row, group);
          try {
            const hit = await geocode(target.query, { apiKey: settings.apiKey.trim(), countryCode: settings.countryCode, signal });
            if (signal.aborted) return;
            target.hit = hit;
            Object.assign(target, classify(hit, address));
          } catch (err) {
            if (signal.aborted) return;
            if (err instanceof GeocodeError && (err.status === 401 || err.status === 403)) {
              fatalError.value = err.message;
              controller?.abort();
              return;
            }
            target.status = "error";
            target.reason = err instanceof Error ? err.message : "The lookup failed. Try again";
          }
        },
        signal
      );
    } finally {
      running.value = false;
    }
  };

  const run = () => runRows(results.value.filter((r) => r.status === "pending"));
  const retryProblems = () => runRows(results.value.filter((r) => r.status === "none" || r.status === "error" || r.status === "check"));
  const cancel = () => controller?.abort();

  const counts = computed(() => {
    const c = { total: results.value.length, pending: 0, skipped: 0, placed: 0, approx: 0, check: 0, none: 0, error: 0 };
    for (const r of results.value) c[r.status]++;
    return c;
  });

  const done = computed(() => counts.value.total > 0 && counts.value.pending === 0 && !running.value);
  const progressPercent = computed(() => {
    const toDo = counts.value.total - counts.value.skipped;
    if (toDo === 0) return 100;
    return Math.round(((toDo - counts.value.pending) / toDo) * 100);
  });

  /** Rows whose pin goes into the download under the current settings */
  const fillable = computed(() =>
    results.value.filter((r) => {
      if (!r.hit) return false;
      if (r.status === "placed") return true;
      if (r.status === "approx") return settings.includeApprox;
      if (r.status === "check") return settings.includeCheck;
      return false;
    })
  );

  const buildOutput = () => {
    const parsed = file.value;
    const group = selectedGroup.value;
    if (!parsed || !group) return undefined;
    const latHeader = latitudeHeader(group);
    const lngHeader = longitudeHeader(group);
    const anchor = group.columns.postcode ?? group.columns.country ?? group.columns.city;
    let headers = insertHeadersAfter(parsed.headers, anchor, [latHeader, lngHeader]);
    const matchHeader = extraHeader(group, "Match");
    const scoreHeader = extraHeader(group, "Match score");
    if (settings.includeDiagnostics) headers = insertHeadersAfter(headers, lngHeader, [matchHeader, scoreHeader]);

    const rows = parsed.rows.map((row) => ({ ...row }));
    for (const result of fillable.value) {
      const hit = result.hit;
      if (!hit) continue;
      const row = rows[result.index];
      row[latHeader] = hit.lat.toFixed(6);
      row[lngHeader] = hit.lng.toFixed(6);
      if (settings.includeDiagnostics) {
        row[matchHeader] = hit.label;
        row[scoreHeader] = hit.score.toFixed(2);
      }
    }
    return { headers, rows };
  };

  const outputFileName = computed(() => `${(file.value?.fileName ?? "addresses").replace(/\.csv$/i, "")}-with-pins.csv`);

  const download = () => {
    const output = buildOutput();
    if (!output) return;
    downloadText(outputFileName.value, toCsv(output.headers, output.rows));
    downloaded.value = true;
  };

  const reset = () => {
    cancel();
    file.value = undefined;
    groups.value = [];
    selectedGroupName.value = undefined;
    results.value = [];
    downloaded.value = false;
    loadError.value = undefined;
    fatalError.value = undefined;
  };

  return {
    settings,
    file,
    groups,
    selectedGroupName,
    selectedGroup,
    matchColumns,
    suggestedMatchColumn,
    results,
    counts,
    running,
    done,
    downloaded,
    outputFileName,
    progressPercent,
    fillable,
    fatalError,
    loadError,
    load,
    run,
    retryProblems,
    cancel,
    download,
    reset
  };
};

export type Geocoder = ReturnType<typeof useGeocoder>;
