const IST_OFFSET_MINUTES = 5 * 60 + 30;

/**
 * Parses a value from Excel (Date object, serial number, or string) and
 * returns an ISO timestamp representing that wall-clock time in IST.
 */
export function toIstIso(value: string | Date | number): string {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  // Treat the parsed wall-clock date/time as IST local time.
  const utcMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  const istMs = utcMs - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(istMs).toISOString();
}

export function formatIst(isoString: string): string {
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatIstDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/** Returns the [startIsoUtc, endIsoUtc) range for a given IST month, e.g. "2026-09". */
export function istMonthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split("-").map(Number);
  const startUtcMs =
    Date.UTC(year, mon - 1, 1, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  const endUtcMs =
    Date.UTC(year, mon, 1, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString(),
  };
}
