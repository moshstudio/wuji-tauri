import { invoke } from '@tauri-apps/api/core';

export async function exit_app(): Promise<void> {
  return await invoke<void>('plugin:commands|exit_app');
}

export async function return_to_home(): Promise<void> {
  return await invoke<void>('plugin:commands|return_to_home');
}

export async function set_status_bar(
  bg: string,
  text?: 'dark' | 'light',
): Promise<boolean | null> {
  const r = await invoke<{ res?: string }>('plugin:commands|set_status_bar', {
    payload: {
      bg: bg,
      text: text,
    },
  });
  return r.res === 'true' ? true : false;
}

export async function hide_status_bar(
  hide: boolean = true,
): Promise<boolean | null> {
  const r = await invoke<{ res?: string }>('plugin:commands|hide_status_bar', {
    payload: { hide: hide },
  });
  return r.res === 'true' ? true : false;
}

export async function get_system_font_scale(): Promise<number> {
  const r = await invoke<{ value?: number }>(
    'plugin:commands|get_system_font_scale',
    {
      payload: {},
    },
  );
  return Number(r.value);
}

export async function get_screen_orientation(): Promise<
  'landscape' | 'portrait' | 'auto'
> {
  const r = await invoke<{ value?: 'landscape' | 'portrait' | 'auto' }>(
    'plugin:commands|get_screen_orientation',
    {
      payload: {},
    },
  ); // 如果r.value为undefined，返回默认值'auto'
  return r.value || 'auto';
}
export async function set_screen_orientation(
  orientation: 'landscape' | 'portrait' | 'auto',
): Promise<boolean | null> {
  const r = await invoke<{ res?: string }>(
    'plugin:commands|set_screen_orientation',
    {
      payload: {
        orientation: orientation,
      },
    },
  );
  return r.res === 'true' ? true : false;
}

export async function get_brightness(): Promise<number> {
  const r = await invoke<{ value?: number }>('plugin:commands|get_brightness', {
    payload: {},
  });
  return Number(r.value);
}

export async function get_system_brightness(): Promise<number> {
  const r = await invoke<{ value?: number }>(
    'plugin:commands|get_system_brightness',
    {
      payload: {},
    },
  );
  return Number(r.value);
}

export async function set_brightness(value: number): Promise<Boolean | null> {
  const r = await invoke<{ value?: boolean }>(
    'plugin:commands|set_brightness',
    {
      payload: {
        brightness: value,
      },
    },
  );
  return r.value ? r.value : null;
}

export async function get_volume(): Promise<number> {
  const r = await invoke<{ value?: number }>('plugin:commands|get_volume', {
    payload: {},
  });
  return Number(r.value);
}

export async function set_volume(value: number): Promise<Boolean | null> {
  const r = await invoke<{ value?: boolean }>('plugin:commands|set_volume', {
    payload: {
      volume: value,
    },
  });
  return r.value ? r.value : null;
}

export async function get_device_id(): Promise<string> {
  const r = await invoke<{ value?: String }>('plugin:commands|get_device_id', {
    payload: {},
  });
  return String(r.value);
}

export async function save_file(
  directoryType: number,
  fileName: string,
  content: Uint8Array,
  subPath?: String,
): Promise<Boolean> {
  const r = await invoke<{ value?: Boolean }>('plugin:commands|save_file', {
    payload: {
      directoryType,
      fileName,
      content,
      subPath,
    },
  });
  return r.value ? Boolean(r.value) : false;
}

export async function vibrate(
  duration?: number,
  amplitude?: number,
): Promise<Boolean> {
  const r = await invoke<{ value?: Boolean }>('plugin:commands|vibrate', {
    payload: {
      duration,
      amplitude,
    },
  });
  return r.value ? Boolean(r.value) : false;
}

export async function vibrate_pattern(
  pattern: number[],
  repeat?: number,
  amplitudes?: number[],
): Promise<Boolean> {
  const r = await invoke<{ value?: Boolean }>(
    'plugin:commands|vibrate_pattern',
    {
      payload: {
        pattern,
        repeat,
        amplitudes,
      },
    },
  );
  return r.value ? Boolean(r.value) : false;
}

export async function vibrate_predefined(effectId?: number): Promise<Boolean> {
  /**
   * 0 -> VibrationEffect.EFFECT_CLICK
    1 -> VibrationEffect.EFFECT_DOUBLE_CLICK
    2 -> VibrationEffect.EFFECT_HEAVY_CLICK
    3 -> VibrationEffect.EFFECT_TICK
    else -> VibrationEffect.EFFECT_CLICK
   */
  const r = await invoke<{ value?: Boolean }>(
    'plugin:commands|vibrate_predefined',
    {
      payload: {
        effectId,
      },
    },
  );
  return r.value ? Boolean(r.value) : false;
}
