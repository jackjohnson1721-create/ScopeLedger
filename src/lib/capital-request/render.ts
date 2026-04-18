/**
 * Render capital-request HTML to PDF bytes.
 *
 * Dynamic imports keep puppeteer / chromium out of the Edge runtime. In
 * production on Vercel we use @sparticuz/chromium; locally we fall back
 * to a system Chrome. If neither is present we throw a distinctive
 * error so the caller can surface a clear message.
 *
 * TODO(phase-4-design): this will be replaced by the approved CFO design
 * template — for now it renders the placeholder HTML at letter size.
 */

interface ChromiumLike {
  args: string[];
  executablePath(): Promise<string>;
}

interface PuppeteerLike {
  default: {
    launch(opts: {
      args?: string[];
      executablePath?: string;
      headless: boolean;
    }): Promise<{
      newPage(): Promise<{
        setContent(html: string, opts: { waitUntil: string }): Promise<void>;
        pdf(opts: {
          format: string;
          printBackground: boolean;
          margin: { top: string; bottom: string; left: string; right: string };
        }): Promise<Buffer | Uint8Array>;
      }>;
      close(): Promise<void>;
    }>;
  };
}

export async function renderPdf(html: string): Promise<Uint8Array> {
  let puppeteer: PuppeteerLike;
  try {
    puppeteer = (await import("puppeteer-core")) as unknown as PuppeteerLike;
  } catch {
    throw new Error("capital_request_pdf: puppeteer-core not installed");
  }

  let chromium: ChromiumLike | null = null;
  try {
    const mod = (await import("@sparticuz/chromium")) as unknown as {
      default?: ChromiumLike;
    } & ChromiumLike;
    chromium = mod.default ?? mod;
  } catch {
    // Fine locally — we'll rely on system Chrome via PUPPETEER_EXECUTABLE_PATH.
  }

  const execPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    (chromium ? await chromium.executablePath() : undefined);

  const browser = await puppeteer.default.launch({
    args: chromium?.args ?? ["--no-sandbox"],
    executablePath: execPath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
