import type { CalendarEvent } from '@tv/shared';

let cachedCalendar: { events: CalendarEvent[]; expireMs: number } | null = null;

export async function getForexCalendar(): Promise<CalendarEvent[]> {
  if (cachedCalendar && Date.now() < cachedCalendar.expireMs) {
    return cachedCalendar.events;
  }

  try {
    const url = 'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json';
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ForexFactory calendar HTTP ${res.status}`);
    const data = (await res.json()) as any[];

    const events: CalendarEvent[] = data.map((e) => ({
      dateTimeMs: new Date(e.date).getTime(),
      currency: e.country || 'USD',
      impact:
        e.impact?.toLowerCase() === 'high'
          ? 'high'
          : e.impact?.toLowerCase() === 'medium'
          ? 'medium'
          : 'low',
      event: e.title || '',
      actual: e.actual || undefined,
      forecast: e.forecast || undefined,
      previous: e.previous || undefined,
    }));

    cachedCalendar = {
      events,
      expireMs: Date.now() + 60 * 60 * 1000, // 1 hour cache
    };
    return events;
  } catch (err) {
    console.warn('[forexfactory] calendar fetch error:', err);
    return [];
  }
}
