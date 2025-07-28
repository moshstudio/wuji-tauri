import type { TrayIconEvent, TrayIconOptions } from '@tauri-apps/api/tray';
import ico from '@/assets/icon.ico';
import { Image } from '@tauri-apps/api/image';
import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { Window } from '@tauri-apps/api/window';

export default async function buildTray() {
  const options: TrayIconOptions = {
    tooltip: '无极',
    icon: await Image.fromBytes(await (await fetch(ico)).arrayBuffer()),
    menu: await Menu.new({
      items: [
        {
          id: 'quit',
          text: '退出',
          action: async () => {
            const windows = await Window.getAll();
            windows.forEach((window) => {
              window.close();
            });
          },
        },
      ],
    }),
    action: async (event: TrayIconEvent) => {
      if (event.type === 'DoubleClick') {
        const windows = await Window.getAll();
        const window =
          windows.find((window) => window.label === 'main') || windows[0];

        window?.show();
        window?.setFocus();
      }
    },
  };

  const tray = await TrayIcon.new(options);
  return tray;
}
