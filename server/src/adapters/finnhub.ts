const BASE = 'https://finnhub.io/api/v1';

function getKey(): string {
  return process.env.FINNHUB_API_KEY || '';
}

export function isFinnhubAvailable(): boolean {
  return Boolean(getKey());
}

export async function searchSymbols(q: string): Promise<Array<{ symbol: string; description: string; type: string }>> {
  if (!isFinnhubAvailable()) return [];
  try {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}&token=${getKey()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return (data.result || []).map((r: any) => ({
      symbol: r.symbol,
      description: r.description,
      type: r.type,
    }));
  } catch {
    return [];
  }
}

export async function getCompanyNews(symbol: string): Promise<any[]> {
  if (!isFinnhubAvailable()) return [];
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`${BASE}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${getKey()}`);
    if (!res.ok) return [];
    return (await res.json()) as any[];
  } catch {
    return [];
  }
}

export async function getStockProfile(symbol: string): Promise<any> {
  if (!isFinnhubAvailable()) return null;
  try {
    const res = await fetch(`${BASE}/stock/profile2?symbol=${symbol}&token=${getKey()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
