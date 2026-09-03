import { createHash, randomBytes } from 'node:crypto';
import { TRUSTED_CLIENT_TOKEN } from './constants.ts';

const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

let clockSkewSeconds = 0;

export function adjClockSkewSeconds(skewSeconds: number): void {
  clockSkewSeconds += skewSeconds;
}

export function getClockSkewSeconds(): number {
  return clockSkewSeconds;
}

export function resetClockSkew(): void {
  clockSkewSeconds = 0;
}

export function resetClockSkewForTests(): void {
  resetClockSkew();
}

function readHeader(
  headers: Headers | Record<string, string>,
  name: string,
): string | undefined {
  if (headers instanceof Headers)
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
  return headers[name] ?? headers[name.toLowerCase()];
}

export function getUnixTimestamp(): number {
  return Date.now() / 1000 + clockSkewSeconds;
}

/**
 * Return Javascript-style date string.
 * @returns Javascript-style date string in GMT+0000 (UTC)
 */
export function dateToString(): string {
  const date = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const dayName = days[date.getUTCDay()];
  const monthName = months[date.getUTCMonth()];
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');

  return `${dayName} ${monthName} ${day} ${year} ${hours}:${minutes}:${seconds} GMT+0000 (Coordinated Universal Time)`;
}

/** Parse RFC 2616 Date header into a Unix timestamp in seconds. */
export function parseRfc2616Date(date: string): number | null {
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed))
    return null;
  return parsed / 1000;
}

export function handleClockSkewFromHeaders(
  headers: Headers | Record<string, string> | null | undefined,
): boolean {
  if (!headers)
    return false;

  const serverDate = readHeader(headers, 'Date');
  if (!serverDate)
    return false;

  let serverUnix = parseRfc2616Date(serverDate);
  if (serverUnix == null)
    return false;

  const ageRaw = readHeader(headers, 'Age');
  if (ageRaw != null) {
    const age = Number.parseInt(ageRaw, 10);
    if (Number.isFinite(age) && age >= 0)
      serverUnix += age;
  }

  // Absolute offset from wall clock. Do not fold in the previous skew:
  // `+= server - getUnixTimestamp()` double-counts concurrent 403s and
  // drifts by Date-header second precision on every reconnect.
  clockSkewSeconds = serverUnix - Date.now() / 1000;
  return true;
}

/**
 * Generates the Sec-MS-GEC token: SHA256 of (Windows file time rounded to 5 min + client token).
 * Seconds since 1601 stay in Number's safe range; only the 100ns ticks use BigInt.
 */
export function generateSecMsGecToken(
  unixSeconds: number = getUnixTimestamp(),
): string {
  const unixPlusEpoch = unixSeconds + WIN_EPOCH;
  const roundedSeconds = unixPlusEpoch - (unixPlusEpoch % 300);
  const ticks = BigInt(Math.round(roundedSeconds)) * BigInt(S_TO_NS / 100);
  const strToHash = `${ticks}${TRUSTED_CLIENT_TOKEN}`;
  return createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

export function generateMuid(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

export function headersWithMuid(
  headers: Record<string, string>,
): Record<string, string> {
  return {
    ...headers,
    Cookie: `muid=${generateMuid()};`,
  };
}
