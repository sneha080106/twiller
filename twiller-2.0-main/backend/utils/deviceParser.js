import { UAParser } from "ua-parser-js";

/**
 * Parses a User-Agent header into { browser, os, device }.
 * `device` is one of "mobile" | "tablet" | "laptop" | "desktop".
 * Note: a bare User-Agent string can reliably tell mobile/tablet apart from
 * "computer", but NOT laptop vs. desktop (that distinction doesn't exist in
 * UA strings). We accept an optional screen-width hint from the client to
 * approximate that — see routes/auth.js.
 */
export function parseDevice(userAgent = "") {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name || "Unknown";
  const os = result.os.name || "Unknown";

  let device = "desktop";
  if (result.device.type === "mobile") device = "mobile";
  else if (result.device.type === "tablet") device = "tablet";

  return { browser, os, device };
}

export function isMicrosoftBrowser(browserName = "") {
  const name = browserName.toLowerCase();
  return name.includes("edge") || name.includes("ie") || name.includes("internet explorer");
}

export function isChromeBrowser(browserName = "") {
  const name = browserName.toLowerCase();
  return name.includes("chrome") && !name.includes("edge") && !name.includes("chromium");
}
