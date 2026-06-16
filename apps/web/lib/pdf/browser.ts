import puppeteer, { type Browser } from "puppeteer";

const globalForBrowser = globalThis as unknown as {
  browser: Browser | undefined;
};

export async function getBrowser(): Promise<Browser> {
  if (globalForBrowser.browser?.connected) {
    return globalForBrowser.browser;
  }

  globalForBrowser.browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  return globalForBrowser.browser;
}
