import { TrayIcon, TrayIconEvent, TrayIconOptions } from "@tauri-apps/api/tray";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { Menu } from "@tauri-apps/api/menu";
import { Image } from "@tauri-apps/api/image";
import ico from "@/assets/icon.ico";

export default async function buildTray() {
  const options: TrayIconOptions = {
    tooltip: "无极",
    icon: await Image.fromBytes(await (await fetch(ico)).arrayBuffer()),
    menu: await Menu.new({
      items: [
        {
          id: "quit",
          text: "退出",
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
      if (event.type === "DoubleClick") {
        const windows = await Window.getAll();
        windows[0]?.setFocus();
      }
    },
  };

  const tray = await TrayIcon.new(options);
  return tray;
}