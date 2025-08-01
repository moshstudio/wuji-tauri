import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHashHistory } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views2/tabbar/index.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views2/home/index.vue'),
      },
      {
        path: 'photo',
        name: 'Photo',
        component: () => import('@/views2/photo/index.vue'),
      },
      {
        path: 'photo-shelf',
        name: 'PhotoShelf',
        component: () => import('@/views2/photo/PhotoShelf.vue'),
      },
      {
        path: 'photo-detail/:sourceId/:id',
        name: 'PhotoDetail',
        component: () => import('@/views2/photo/PhotoDetail.vue'),
        props: true,
      },
      {
        path: 'song',
        name: 'Song',
        component: () => import('@/views2/song/index.vue'),
      },
      {
        path: 'song-play-view',
        name: 'SongPlayView',
        component: () => import('@/views2/song/SongPlayView.vue'),
      },
      {
        path: 'song-shelf',
        name: 'SongShelf',
        component: () => import('@/views2/song/SongShelf.vue'),
      },
      {
        path: 'song-shelf-detail/:shelfId',
        name: 'SongShelfDetail',
        component: () => import('@/views2/song/SongShelfDetail.vue'),
        props: true,
      },
      {
        path: 'song-playlist-detail/:sourceId/:playlistId',
        name: 'SongPlaylistDetail',
        component: () => import('@/views2/song/PlaylistDetail.vue'),
        props: true,
      },
      {
        path: 'book',
        name: 'Book',
        component: () => import('@/views2/book/index.vue'),
      },
      {
        path: 'book-shelf',
        name: 'BookShelf',
        component: () => import('@/views2/book/BookShelf.vue'),
      },
      {
        path: 'book-detail/:sourceId/:bookId',
        name: 'BookDetail',
        component: () => import('@/views2/book/BookDetail.vue'),
        props: true,
      },
      {
        path: 'book-read/:sourceId/:bookId/:chapterId/:isPrev?',
        name: 'BookRead',
        component: () => import('@/views2/book/BookRead.vue'),
        props: true,
      },
      {
        path: 'comic',
        name: 'Comic',
        component: () => import('@/views2/comic/index.vue'),
      },
      {
        path: 'comic-shelf',
        name: 'ComicShelf',
        component: () => import('@/views2/comic/ComicShelf.vue'),
      },
      {
        path: 'comic-detail/:sourceId/:comicId',
        name: 'ComicDetail',
        component: () => import('@/views2/comic/ComicDetail.vue'),
        props: true,
      },
      {
        path: 'comic-read/:sourceId/:comicId/:chapterId',
        name: 'ComicRead',
        component: () => import('@/views2/comic/ComicRead.vue'),
        props: true,
      },
      {
        path: 'video',
        name: 'Video',
        component: () => import('@/views2/video/index.vue'),
      },
      {
        path: 'video-shelf',
        name: 'VideoShelf',
        component: () => import('@/views2/video/VideoShelf.vue'),
      },
      {
        path: 'video-detail/:sourceId/:videoId',
        name: 'VideoDetail',
        component: () => import('@/views2/video/VideoDetail.vue'),
        props: true,
      },
    ],
  },
  {
    path: '/source-manage',
    name: 'SourceManage',
    component: () => import('@/views2/source/ManageSource.vue'),
  },
  {
    path: '/source-create',
    name: 'SourceCreate',
    component: () => import('@/views2/source/CreateSource.vue'),
  },
  {
    path: '/setting',
    name: 'Setting',
    component: () => import('@/views2/setting/index.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views2/about/index.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views2/auth/Login.vue'),
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('@/views2/auth/User.vue'),
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
router.beforeEach((to, from, next) => {
  if (!to.matched.length) {
    to.meta.transition = 'slide-right';
    if (to.path.startsWith('/song')) {
      next({ name: 'Song', params: { transition: 'slide-right' } });
    } else if (to.path.startsWith('/photo')) {
      next({ name: 'Photo', params: { transition: 'slide-right' } });
    } else if (to.path.startsWith('/video')) {
      next({ name: 'Video', params: { transition: 'slide-right' } });
    } else if (to.path.startsWith('/book')) {
      next({ name: 'Book', params: { transition: 'slide-right' } });
    } else if (to.path.startsWith('/comic')) {
      next({ name: 'Comic', params: { transition: 'slide-right' } });
    } else {
      next('/');
    }
  } else {
    if (to.params.transition) {
      to.meta.transition = to.params.transition;
    }
    (to as any).prevPathName = from.name;
    console.log(from.fullPath, ' => ', to.fullPath);
    next();
  }
});
