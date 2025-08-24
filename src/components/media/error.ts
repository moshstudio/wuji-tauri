export const getErrorDisplayHTML = (errorCode: number) => {
  const errorConfig = {
    1: {
      title: '播放已中止',
      message: '视频加载被中断',
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    },
    2: {
      title: '网络错误',
      message: '请检查您的网络连接',
      icon: 'M8.111 16.404a5.5 5.5 0 0 1 7.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
    },
    3: {
      title: '解码错误',
      message: '视频数据损坏或格式不支持',
      icon: 'M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z',
    },
    4: {
      title: '格式不支持',
      message: '当前浏览器不支持此视频格式',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2zM9 9h6v6H9V9z',
    },
  };

  const config = errorConfig[errorCode as keyof typeof errorConfig] || {
    title: '播放错误',
    message: '视频播放出现问题',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  };
  return `
    <div class="vjs-error-display-custom pointer-events-none w-full flex items-center justify-center">
      <p class="pointer-events-none text-xs text-gray-400">code: ${errorCode}</p>
    </div>
  `;

  // return `
  //   <div class="vjs-error-display-custom pointer-events-none w-full h-full flex items-center justify-center "
  //        style="position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;">
  //     <div class="text-center p-6 max-w-md">
  //       <svg class="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  //         <path stroke-linecap="round" stroke-linejoin="round" d="${config.icon}" />
  //       </svg>
  //       <h3 class="mt-4 text-xl font-medium text-white">${config.title}</h3>
  //       <p class="mt-2 text-gray-300">${config.message}</p>
  //       <div class="mt-2 border-t border-gray-600 pt-2">
  //         <p class="text-xs text-gray-400">错误代码: ${errorCode}</p>
  //       </div>
  //     </div>
  //   </div>
  // `;
};

// 使用示例
// player.value!.errorDisplay.contentEl().innerHTML = getErrorDisplayHTML(error.code);
