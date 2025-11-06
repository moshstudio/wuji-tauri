export async function loadFont(url: string) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export async function loadReadFonts() {
  for (const url of [
    'https://cdn.jsdmirror.com/npm/cn-fontsource-source-han-sans-sc-vf@1.0.10/font.min.css',
    'https://cdn.jsdmirror.com/npm/cn-fontsource-fz-fang-song-z-02-s-regular@1.1.0/font.min.css',
    'https://cdn.jsdmirror.com/npm/cn-fontsource-lxgw-wen-kai-gb-screen@1.0.6/font.min.css',
    'https://cdn.jsdmirror.com/npm/cn-fontsource-maoken-zhuyuan-ti-regular@1.0.1/font.min.css',
  ]) {
    await loadFont(url);
  }
}
