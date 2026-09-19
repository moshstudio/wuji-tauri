import { getOrCreateDeviceId } from '@wuji-tauri/sync';
import { nanoid } from 'nanoid';

export {
  clockFromItem,
  clockFromOp,
  compareLww,
  entityTsKey,
  incomingWinsPatch,
  incomingWinsPull,
  type LwwClock,
  nextLogicalTime,
  peekEntityTs,
  rememberEntityTs,
  resetEntityTsForTests,
} from '@wuji-tauri/sync';

export function getSyncDeviceId(): string {
  try {
    if (typeof localStorage === 'undefined')
      return 'unknown';
    return getOrCreateDeviceId({
      getItem: key => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: key => localStorage.removeItem(key),
    }, nanoid);
  }
  catch {
    return 'unknown';
  }
}
