import { createWebHashHistory, createRouter, RouteRecordRaw } from 'vue-router';
import Home from '@/views/home/index.vue';
import Photo from '@/views/photo/index.vue';
import PhotoDetail from '@/views/photo/PhotoDetail.vue';
import Song from '@/views/song/index.vue';
import PlaylistDetail from '@/views/song/PlaylistDetail.vue';
import Book from '@/views/book/index.vue';
import BookDetail from '@/views/book/BookDetail.vue';
import BookRead from '@/views/book/BookRead.vue';
import Comic from '@/views/comic/index.vue';
import ComicDetail from '@/views/comic/ComicDetail.vue';
import ComicRead from '@/views/comic/ComicRead.vue';
import { type as osType } from '@tauri-apps/plugin-os';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: osType() == 'android' ? '/photo' : '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    // component: () => import("@/windows/views/Home.vue"),
  },
  {
    path: '/photo',
    name: 'Photo',
    component: Photo,
  },
  {
    path: '/photo/detail/:sourceId/:id',
    name: 'PhotoDetail',
    component: PhotoDetail,
    props: true,
  },
  {
    path: '/song',
    name: 'Song',
    component: Song,
  },
  {
    path: '/song/playlist/:sourceId/:playlistId',
    name: 'SongPlaylist',
    component: PlaylistDetail,
    props: true,
  },
  {
    path: '/book',
    name: 'Book',
    component: Book,
    children: [],
  },
  {
    path: '/book/detail/:sourceId/:bookId',
    name: 'BookDetail',
    component: BookDetail,
    props: true,
  },
  {
    path: '/book/read/:sourceId/:bookId/:chapterId/:isPrev?',
    name: 'BookRead',
    component: BookRead,
    props: true,
  },
  {
    path: '/comic',
    name: 'Comic',
    component: Comic,
    children: [],
  },
  {
    path: '/comic/detail/:sourceId/:comicId',
    name: 'ComicDetail',
    component: ComicDetail,
    props: true,
  },
  {
    path: '/comic/read/:sourceId/:comicId/:chapterId',
    name: 'ComicRead',
    component: ComicRead,
    props: true,
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
router.beforeEach((to, from, next) => {
  console.log(from.fullPath, ' => ', to.fullPath);
  next();
});
