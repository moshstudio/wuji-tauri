import type { RouteRecordRaw } from 'vue-router';
// import BookDetail from '@/views/book/BookDetail.vue';
// import BookRead from '@/views/book/BookRead.vue';
// import Book from '@/views/book/index.vue';
// import ComicDetail from '@/views/comic/ComicDetail.vue';
// import ComicRead from '@/views/comic/ComicRead.vue';
// import Comic from '@/views/comic/index.vue';
// import Home from '@/views/home/index.vue';
// import Photo from '@/views/photo/index.vue';
// import PhotoDetail from '@/views/photo/PhotoDetail.vue';
// import Song from '@/views/song/index.vue';
// import PlaylistDetail from '@/views/song/PlaylistDetail.vue';
// import Video from '@/views/video/index.vue';
// import VideoDetail from '@/views/video/VideoDetail.vue';
import { type as osType } from '@tauri-apps/plugin-os';
import { createRouter, createWebHashHistory } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: osType() == 'android' ? '/photo' : '/home',
  },
  {
    path: '/home',
    name: 'Home',
    // component: Home,
    component: () => import('@/views/home/index.vue'),
  },
  {
    path: '/photo',
    name: 'Photo',
    // component: Photo,
    component: () => import('@/views/photo/index.vue'),
  },
  {
    path: '/photo/detail/:sourceId/:id',
    name: 'PhotoDetail',
    // component: PhotoDetail,
    component: () => import('@/views/photo/PhotoDetail.vue'),
    props: true,
  },
  {
    path: '/song',
    name: 'Song',
    // component: Song,
    component: () => import('@/views/song/index.vue'),
  },
  {
    path: '/song/playlist/:sourceId/:playlistId',
    name: 'SongPlaylist',
    // component: PlaylistDetail,
    component: () => import('@/views/song/PlaylistDetail.vue'),
    props: true,
  },
  {
    path: '/book',
    name: 'Book',
    // component: Book,
    component: () => import('@/views/book/index.vue'),
    children: [],
  },
  {
    path: '/book/detail/:sourceId/:bookId',
    name: 'BookDetail',
    // component: BookDetail,
    component: () => import('@/views/book/BookDetail.vue'),
    props: true,
  },
  {
    path: '/book/read/:sourceId/:bookId/:chapterId/:isPrev?',
    name: 'BookRead',
    // component: BookRead,
    component: () => import('@/views/book/BookRead.vue'),
    props: true,
  },
  {
    path: '/comic',
    name: 'Comic',
    // component: Comic,
    component: () => import('@/views/comic/index.vue'),
    children: [],
  },
  {
    path: '/comic/detail/:sourceId/:comicId',
    name: 'ComicDetail',
    // component: ComicDetail,
    component: () => import('@/views/comic/ComicDetail.vue'),
    props: true,
  },
  {
    path: '/comic/read/:sourceId/:comicId/:chapterId',
    name: 'ComicRead',
    // component: ComicRead,
    component: () => import('@/views/comic/ComicRead.vue'),
    props: true,
  },
  {
    path: '/video',
    name: 'Video',
    // component: Video,
    component: () => import('@/views/video/index.vue'),
    children: [],
  },
  {
    path: '/video/detail/:sourceId/:videoId',
    name: 'VideoDetail',
    // component: VideoDetail,
    component: () => import('@/views/video/VideoDetail.vue'),
    props: true,
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
router.beforeEach((to, from, next) => {
  (to as any).prevPathName = from.name;
  console.log(from.fullPath, ' => ', to.fullPath);
  next();
});
