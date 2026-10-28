const GEOCODE_URL = "https://geocode.search.hereapi.com/v1/geocode";

/**
 * The tool's own HERE key, separate from the Kinabase client's so this usage never touches the live quota.
 * It comes from VITE_HERE_API_KEY at build time (.env locally, a repository secret on GitHub Pages) and is
 * never committed. Empty means the page asks for one in settings.
 */
export const DEFAULT_HERE_API_KEY = (import.meta.env.VITE_HERE_API_KEY ?? "").trim();

export interface GeocodeHit {
  label: string;
  lat: number;
  lng: number;
  /** HERE's 0..1 confidence that the result answers the query */
  score: number;
  /** HERE result granularity: houseNumber, street, locality, postalCodePoint, place... */
  resultType: string;
  countryCode: string;
}

interface HereGeocodeResponse {
  items?: {
    title: string;
    resultType: string;
    address?: { label?: string; countryCode?: string };
    position?: { lat: number; lng: number };
    scoring?: { queryScore?: number };
  }[];
}

export class GeocodeError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

export interface GeocodeOptions {
  apiKey: string;
  /** ISO 3166-1 alpha-3 country code to restrict results to, or empty for anywhere */
  countryCode?: string;
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Geocodes one free-text address, retrying on rate limits with backoff */
export const geocode = async (query: string, options: GeocodeOptions): Promise<GeocodeHit | undefined> => {
  const params = new URLSearchParams({ q: query, apiKey: options.apiKey, limit: "1", lang: "en-GB" });
  if (options.countryCode) params.set("in", `countryCode:${options.countryCode}`);
  const url = `${GEOCODE_URL}?${params.toString()}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { signal: options.signal });
    if (res.status === 429 || res.status >= 500) {
      // HERE rate-limits bursts; back off and try again rather than failing the row
      await sleep(600 * 2 ** attempt, options.signal);
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new GeocodeError("The HERE API key was rejected. Check it in settings.", res.status);
    if (!res.ok) throw new GeocodeError(`HERE returned ${res.status}.`, res.status);

    const body = (await res.json()) as HereGeocodeResponse;
    const item = body.items?.[0];
    if (!item?.position) return undefined;
    return {
      label: item.address?.label ?? item.title,
      lat: item.position.lat,
      lng: item.position.lng,
      score: item.scoring?.queryScore ?? 0,
      resultType: item.resultType,
      countryCode: item.address?.countryCode ?? ""
    };
  }
  throw new GeocodeError("HERE kept rate-limiting the request.", 429);
};

/** Runs tasks with at most `limit` in flight, so a long list stays inside HERE's requests-per-second cap */
export const runWithConcurrency = async <T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>, signal?: AbortSignal) => {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      if (signal?.aborted) return;
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(lanes);
};

export const COUNTRY_OPTIONS: { code: string; label: string; aliases: string[] }[] = [
  { code: "", label: "Any country", aliases: [] },
  { code: "GBR", label: "United Kingdom", aliases: ["uk", "united kingdom", "great britain", "gb", "england", "scotland", "wales", "northern ireland", "britain"] },
  { code: "IRL", label: "Ireland", aliases: ["ireland", "republic of ireland", "ie", "eire"] },
  { code: "USA", label: "United States", aliases: ["usa", "united states", "us", "united states of america", "america"] },
  { code: "CAN", label: "Canada", aliases: ["canada", "ca"] },
  { code: "AUS", label: "Australia", aliases: ["australia", "au"] },
  { code: "NZL", label: "New Zealand", aliases: ["new zealand", "nz"] },
  { code: "DEU", label: "Germany", aliases: ["germany", "de", "deutschland"] },
  { code: "FRA", label: "France", aliases: ["france", "fr"] },
  { code: "ESP", label: "Spain", aliases: ["spain", "es", "españa"] },
  { code: "NLD", label: "Netherlands", aliases: ["netherlands", "nl", "holland"] }
];

/** Picks the country most rows name, if a clear majority do, so the restriction defaults sensibly */
export const suggestCountry = (countries: string[]): string => {
  const counts = new Map<string, number>();
  let named = 0;
  for (const raw of countries) {
    const value = raw.trim().toLowerCase();
    if (!value) continue;
    named++;
    const option = COUNTRY_OPTIONS.find((o) => o.aliases.includes(value));
    if (!option) continue;
    counts.set(option.code, (counts.get(option.code) ?? 0) + 1);
  }
  if (named === 0) return "";
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!best || best[1] / named < 0.8) return "";
  return best[0];
};
