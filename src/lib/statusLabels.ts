import type { RowStatus } from "./geocoder";

/** The words the page uses for each outcome; kept in one place so the table, the summary and the badges agree */
export const STATUS_LABELS: Record<RowStatus, string> = {
  pending: "Waiting",
  skipped: "Skipped",
  placed: "Placed",
  approx: "Approximate",
  check: "Check this",
  none: "Not found",
  error: "Failed"
};

/** One-line meaning of each outcome, for tooltips and the legend */
export const STATUS_MEANING: Record<RowStatus, string> = {
  pending: "Not searched yet",
  skipped: "Left as it is",
  placed: "The exact address was found. The pin is on the building",
  approx: "The postcode or street was found but not the exact building. The pin is close, usually within a street",
  check: "The result is doubtful. Look at what was found before trusting it",
  none: "Nothing was found for this address",
  error: "The lookup failed, usually a network blip. Retry"
};
