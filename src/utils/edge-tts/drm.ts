import { createHash } from 'node:crypto';

export const CHROMIUM_FULL_VERSION = '130.0.2849.68';
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;

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

export function generateSecMsGecToken() {
  const ticks =
    BigInt(Math.floor(Date.now() / 1000 + Number(WINDOWS_FILE_TIME_EPOCH))) *
    10000000n;
  const roundedTicks = ticks - (ticks % 3000000000n);

  const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;

  const hash = createHash('sha256');
  hash.update(strToHash, 'ascii');

  return hash.digest('hex').toUpperCase();
}
