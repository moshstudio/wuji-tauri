import semver from 'semver';
import { useDisplayStore } from '@/store';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { showConfirmDialog, showDialog, showToast } from 'vant';
import { fetch } from '@wuji-tauri/fetch';

function calculateProgress(currentBytes: number) {
  // 假设文件大小为20M, 越接近越到100%
  const fileSizeBytes = 20 * 1024 * 1024; // 20M in bytes
  const progress = Math.max(
    0,
    Math.min((currentBytes / fileSizeBytes) * 100, 99),
  );
  return progress;
}

/**
 * 格式化文件大小
 * @param {number} bytes 文件大小(字节)
 * @returns {string} 格式化后的字符串
 */
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

async function windowsCheckAndUpdate() {
  const appVersion = await getVersion();
  const update = await check();
  if (update) {
    try {
      const confirm = await showConfirmDialog({
        title: `发现新版本 ${update.version}`,
        message: `
      <div style="text-align: left; display: flex; flex-direction: column;">
        <h4 style="margin: 5px 0 8px; color: #1989fa; display: flex; align-items: center;">
          <svg style="margin-right: 6px; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2zm2-4h-2V7h2z"/>
          </svg>
          <span>更新内容</span>
        </h4>
        <div style="max-height: 200px; overflow-y: auto; padding: 5px; background: #f7f8fa; border-radius: 4px;">
          ${update.body}
        </div>
      </div>
    `,
        confirmButtonText: '立即升级',
        cancelButtonText: '暂不升级',
        messageAlign: 'left',
        // 允许使用HTML
        allowHtml: true,
      });
      if (confirm === 'confirm') {
        let downloadedBytes = 0;
        let progress = 0;
        // 显示下载进度对话框
        const dialog = showDialog({
          title: `正在下载新版本 ${update.version}...`,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: '后台下载',
          closeOnPopstate: false,
          message: `
      <div style="text-align: center; display: flex; flex-direction: column;">
        <div style="display: flex; margin: 15px 0; height: 4px; background: #ebedf0; border-radius: 2px; overflow: hidden;">
          <div id="updateProgressBar" style="width: ${progress}%; height: 100%; background: #07c160; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
        <p id="updateProgressText" style="font-size: 12px; color: #969799;">
          ${progress}% · 已下载 ${formatFileSize(downloadedBytes)}
        </p>
      </div>
    `,
          allowHtml: true,
        });
        // alternatively we could also call update.download() and update.install() separately
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              downloadedBytes = event.data.contentLength || 0;
              break;
            case 'Progress':
              downloadedBytes += event.data.chunkLength;
              progress = calculateProgress(downloadedBytes);
              const progressBar = document.getElementById('updateProgressBar');
              const progressText =
                document.getElementById('updateProgressText');
              if (progressBar && progressText) {
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}% · 已下载 ${formatFileSize(downloadedBytes)}`;
              }
              break;
            case 'Finished':
              break;
          }
        });
        await relaunch();
      }
    } catch (error) {}
    return true;
  } else {
    return false;
  }
}

async function getAndroidUpdateFile(): Promise<{
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    cloudpan: {
      url: string;
    };
  };
}> {
  const url = 'https://wuji.moshangwangluo.com/wuji/updater_android.json';
  const response = await fetch(url);
  const json = await response.json();
  return json;
}

function copyToClipboard(text: string) {
  // 创建临时textarea
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, 99999); // 移动端支持

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (successful) {
      console.log('复制成功');
      return true;
    }
  } catch (err) {
    console.error('复制失败:', err);
    document.body.removeChild(textarea);
  }

  return false;
}

async function androidCheckAndUpdate() {
  const appVersion = await getVersion();
  const newInfo = await getAndroidUpdateFile();
  if (semver.gt(newInfo.version, appVersion)) {
    const confirm = await showConfirmDialog({
      title: `发现新版本 ${newInfo.version}`,
      message: `
      <div style="text-align: left; display: flex; flex-direction: column;">
        <h4 style="margin: 5px 0 8px; color: #1989fa; display: flex; align-items: center;">
          <svg style="margin-right: 6px; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2zm2-4h-2V7h2z"/>
          </svg>
          <span>更新内容</span>
        </h4>
        <div style="max-height: 200px; overflow-y: auto; padding: 5px; background: #f7f8fa; border-radius: 4px;">
          ${newInfo.notes}
        </div>
      </div>
    `,
      confirmButtonText: '跳转下载',
      cancelButtonText: '暂不升级',
      messageAlign: 'left',
      allowHtml: true,
    });
    if (confirm === 'confirm') {
      console.log(newInfo.platforms.cloudpan.url);
      if (!copyToClipboard(newInfo.platforms.cloudpan.url)) {
        showToast('下载链接已复制到剪贴板,请手动在浏览器打开');
      } else {
        showConfirmDialog({
          title: '请手动复制访问',
          message: newInfo.platforms.cloudpan.url,
          showCancelButton: false,
          confirmButtonText: '关闭',
        });
      }
    }
    return true;
  } else {
    return false;
  }
}

export async function checkAndUpdate() {
  const displayStore = useDisplayStore();
  if (displayStore.isWindows) {
    return await windowsCheckAndUpdate();
  } else if (displayStore.isAndroid) {
    return await androidCheckAndUpdate();
  }
}
