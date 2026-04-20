// Normalize a client-sent timestamp to an ISO UTC string.
// Accepts:
//   - ISO with timezone designator (e.g. "2026-04-14T06:00:00.000Z" or "...+02:00") → parsed as-is
//   - datetime-local format without TZ ("YYYY-MM-DDTHH:MM[:SS]") → interpreted as Europe/Paris local
//
// Using explicit Europe/Paris conversion (with DST handling via Intl) avoids any dependency on
// the browser's or server's TZ settings.

const HAS_TZ = /[Zz]$|[+-]\d{2}:?\d{2}$/;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function normalizeClientTimestamp(ts: string): string {
  if (!ts) return ts;
  if (HAS_TZ.test(ts)) {
    return new Date(ts).toISOString();
  }
  const m = ts.match(LOCAL_RE);
  if (!m) {
    return new Date(ts).toISOString();
  }
  const [, Y, M, D, H, mm, ss] = m;
  const asUtc = Date.UTC(+Y, +M - 1, +D, +H, +mm, +(ss || '0'));
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(new Date(asUtc));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const parisAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  const offsetMs = parisAsUtc - asUtc;
  return new Date(asUtc - offsetMs).toISOString();
}
