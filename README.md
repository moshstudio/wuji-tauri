# 无极 (Wuji)

<p align="center">
  <img src="./app-icon.png" alt="Wuji Logo" width="128" height="128">
</p>

<p align="center">
  <strong>一款界面简洁、功能强大的跨平台资源聚合浏览器</strong>
</p>

<p align="center">
  <a href="https://github.com/moshstudio/wuji-tauri/releases">
    <img src="https://img.shields.io/github/downloads/moshstudio/wuji-tauri/total?style=flat-square&color=blue" alt="downloads">
  </a>
  <a href="https://github.com/moshstudio/wuji-tauri/stargazers">
    <img src="https://img.shields.io/github/stars/moshstudio/wuji-tauri?style=flat-square&color=yellow" alt="stars">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/github/license/moshstudio/wuji-tauri?style=flat-square&color=red" alt="license">
  </a>
</p>

## 📖 简介 (Introduction)

**无极** 旨在打破不同媒体资源之间的壁垒，为您打造一个统一、纯净的数字娱乐中心。无论是欣赏美图、聆听音乐、沉浸阅读还是观看视频，您都可以在这里一站式搞定。

我们致力于提供极致的用户体验，无广告、无打扰，只需一个应用，即可连接您的所有兴趣。

## ✨ 核心功能 (Core Features)

### 🌌 资源聚合

聚合**图片**、**音乐**、**书籍**、**漫画**、**视频**资源的浏览、搜索与收藏。

### 🎵 音乐

支持歌单搜索、收藏、歌单导入。拥有沉浸式播放页及歌词显示。

### 📚 阅读

支持书籍与漫画的浏览、搜索。提供书架管理与阅读功能。

### 🎬 视频

支持视频资源的浏览、搜索、收藏及全屏播放。

### ☁️ 同步与设置

支持 Windows 与 Android 端账号登录。提供云端同步功能（需手动同步），可同步收藏夹与偏好设置。

---

## 📥 下载与安装 (Download)

请前往 **[Releases 页面](https://github.com/moshstudio/wuji-tauri/releases)** 下载最新版本的安装包。

- **Windows**: 下载 `.exe` 安装包。
- **Android**: 下载 `.apk` 安装包。

---

## ❓ 常见问题 (Q&A)

<details>
<summary><strong>1. 如何导入默认源？</strong></summary>
初次打开软件时，若未检测到订阅源，系统会自动提示是否导入`默认订阅源`。点击“确认”即可快速开始使用。
</details>

<details>
<summary><strong>2. 什么是“订阅源”？如何获取？</strong></summary>
**无极** 是一个浏览器壳，资源内容依赖于“订阅源”。
您可以在软件内的“订阅源市场”发现并一键导入推荐源，也可以在网络上寻找社区分享的自定义源链接进行导入。
</details>

<details>
<summary><strong>3. 订阅源无法使用了怎么办？</strong></summary>
建议定期在“管理订阅源”页面点击更新按钮，获取源作者的最新维护版本。如果依然失效，可能需要更换其他订阅源。
</details>

---

## 👨‍💻 开发者指南 (For Developers)

<details>
<summary><strong>点击展开构建与技术细节</strong></summary>

### 技术栈

本项目基于 **Tauri v2** + **Vue 3** 构建，追求极致性能与原生体验。

- **Core**: Tauri (Rust)
- **UI**: Vue 3, Vite, TailwindCSS, Vant (Mobile), Vuetify (Desktop)
- **State**: Pinia

### 本地构建

1.  环境要求: Node.js (LTS), Rust, pnpm.
2.  克隆仓库: `git clone https://github.com/moshstudio/wuji-tauri.git`
3.  安装依赖: `pnpm install`
4.  运行开发环境: `pnpm tauri dev`
5.  打包构建: `pnpm tauri build`

</details>

## 📄 许可证 (License)

本项目采用 [GPL-3.0](./LICENSE) 许可证开源。
