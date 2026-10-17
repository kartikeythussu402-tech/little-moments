import { JWT } from "google-auth-library";
import { columnLetter, WORKSHEETS, type SheetName } from "./schema";

/** The minimal spreadsheet operations the sync worker needs. Mockable in tests. */
export interface SheetsApi {
  listSheets(): Promise<string[]>;
  addSheets(titles: string[]): Promise<void>;
  getRange(range: string): Promise<string[][]>;
  updateRanges(data: Array<{ range: string; values: string[][] }>): Promise<void>;
  append(sheet: SheetName, rows: string[][]): Promise<void>;
}

export class SheetsHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
  /** 429 / 5xx / network → retry later. 4xx config errors are also retried (operator can fix). */
  get transient() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export function sheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && !process.env.GOOGLE_PRIVATE_KEY.includes("REPLACE_ME"));
}

const q = (sheet: string) => `'${sheet.replaceAll("'", "''")}'`;

/** Google Sheets REST client authenticated as a service account (server-only). */
export class GoogleSheets implements SheetsApi {
  private jwt: JWT;
  private base: string;

  constructor(
    spreadsheetId = process.env.GOOGLE_SHEET_ID!,
    email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  ) {
    this.jwt = new JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    this.base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { token } = await this.jwt.getAccessToken();
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new SheetsHttpError(`Network error talking to Google Sheets: ${(e as Error).message}`, 0);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new SheetsHttpError(`Google Sheets ${res.status}: ${body.slice(0, 300)}`, res.status);
    }
    return (await res.json()) as T;
  }

  async listSheets() {
    const data = await this.req<{ sheets?: Array<{ properties: { title: string } }> }>("?fields=sheets.properties.title");
    return (data.sheets ?? []).map((s) => s.properties.title);
  }

  async addSheets(titles: string[]) {
    if (!titles.length) return;
    await this.req(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({ requests: titles.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
    });
  }

  async getRange(range: string) {
    const data = await this.req<{ values?: string[][] }>(`/values/${encodeURIComponent(range)}?majorDimension=ROWS`);
    return data.values ?? [];
  }

  async updateRanges(data: Array<{ range: string; values: string[][] }>) {
    if (!data.length) return;
    await this.req("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
  }

  async append(sheet: SheetName, rows: string[][]) {
    if (!rows.length) return;
    const range = `${q(sheet)}!A1:${columnLetter(WORKSHEETS[sheet].length)}1`;
    await this.req(`/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: JSON.stringify({ majorDimension: "ROWS", values: rows }),
    });
  }
}

export { q as quoteSheet };
