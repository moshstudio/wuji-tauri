import type {
  RouteLocationNormalizedGeneric,
  RouteRecordRaw,
} from 'vue-router';
import { createRouter, createWebHashHistory } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/tabbar/index.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
      },
      {
        path: 'photo',
        children: [
          {
            path: '',
            name: 'Photo',
            component: () => import('@/views/photo/index.vue'),
          },
          {
            path: 'shelf',
            name: 'PhotoShelf',
            component: () => import('@/views/photo/PhotoShelf.vue'),
          },
          {
            path: ':sourceId/:id',
            name: 'PhotoDetail',
            component: () => import('@/views/photo/PhotoDetail.vue'),
            props: true,
          },
        ],
      },
      {
        path: 'song',
        children: [
          {
            path: '',
            name: 'Song',
            component: () => import('@/views/song/index.vue'),
          },
          {
            path: 'play-view',
            name: 'SongPlayView',
            component: () => import('@/views/song/SongPlayView.vue'),
          },
          {
            path: 'shelf',
            children: [
              {
                path: '',
                name: 'SongShelf',
                component: () => import('@/views/song/SongShelf.vue'),
              },
              {
                path: ':shelfId',
                name: 'SongShelfDetail',
                component: () => import('@/views/song/SongShelfDetail.vue'),
                props: true,
              },
            ],
          },
          {
            path: 'playlist',
            children: [
              {
                path: ':sourceId/:playlistId',
                name: 'SongPlaylistDetail',
                component: () => import('@/views/song/PlaylistDetail.vue'),
                props: true,
              },
            ],
          },
        ],
      },
      {
        path: 'book',
        children: [
          {
            path: '',
            name: 'Book',
            component: () => import('@/views/book/index.vue'),
          },
          {
            path: 'shelf',
            name: 'BookShelf',
            component: () => import('@/views/book/BookShelf.vue'),
          },
          {
            path: ':sourceId/:bookId',
            name: 'BookDetail',
            component: () => import('@/views/book/BookDetail.vue'),
            props: true,
          },
          {
            path: ':sourceId/:bookId/:chapterId/:isPrev?',
            name: 'BookRead',
            component: () => import('@/views/book/BookRead.vue'),
            props: true,
          },
        ],
      },
      {
        path: 'comic',
        children: [
          {
            path: '',
            name: 'Comic',
            component: () => import('@/views/comic/index.vue'),
            props: true,
          },
          {
            path: 'shelf',
            name: 'ComicShelf',
            component: () => import('@/views/comic/ComicShelf.vue'),
          },
          {
            path: ':sourceId/:comicId',
            name: 'ComicDetail',
            component: () => import('@/views/comic/ComicDetail.vue'),
            props: true,
          },
          {
            path: ':sourceId/:comicId/:chapterId',
            name: 'ComicRead',
            component: () => import('@/views/comic/ComicRead.vue'),
            props: true,
          },
        ],
      },
      {
        path: 'video',
        children: [
          {
            path: '',
            name: 'Video',
            component: () => import('@/views/video/index.vue'),
          },
          {
            path: 'shelf',
            name: 'VideoShelf',
            component: () => import('@/views/video/VideoShelf.vue'),
          },
          {
            path: ':sourceId/:videoId',
            name: 'VideoDetail',
            component: () => import('@/views/video/VideoDetail.vue'),
            props: true,
          },
        ],
      },
    ],
  },
  {
    path: '/source',
    children: [
      {
        path: 'manage',
        children: [
          {
            path: '',
            name: 'SourceManage',
            component: () => import('@/views/source/ManageSource.vue'),
          },
          {
            path: ':sourceId/:sourceContentId',
            name: 'SourceManageContentEdit',
            component: () =>
              import('@/views/source/ManageSourceContentEdit.vue'),
            props: true,
          },
        ],
      },
      {
        path: 'create',
        name: 'SourceContentCreate',
        component: () => import('@/views/source/CreateSourceContent.vue'),
      },
      {
        path: 'market',
        name: 'SourceMarket',
        component: () => import('@/views/source/SourceMarket.vue'),
      },
      {
        path: 'my',
        children: [
          {
            path: '',
            name: 'SourceMy',
            component: () => import('@/views/source/MySource.vue'),
          },
          {
            path: ':sourceId',
            children: [
              {
                path: '',
                name: 'SourceEdit',
                component: () => import('@/views/source/MySourceEdit.vue'),
                props: true,
              },
              {
                path: ':sourceContentId',
                name: 'SourceContentEdit',
                component: () =>
                  import('@/views/source/MySourceContentEdit.vue'),
                props: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/setting',
    name: 'Setting',
    component: () => import('@/views/setting/index.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/about/index.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('@/views/auth/User.vue'),
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
router.beforeEach((to, from, next) => {
  if (!to.matched.length) {
    to.meta.transition = 'slide-right';
    const name = to.name?.toString();
    if (name?.startsWith('Song')) {
      next({ name: 'Song' });
    } else if (name?.startsWith('Photo')) {
      next({ name: 'Photo' });
    } else if (name?.startsWith('Video')) {
      next({ name: 'Video' });
    } else if (name?.startsWith('Book')) {
      next({ name: 'Book' });
    } else if (name?.startsWith('Comic')) {
      next({ name: 'Comic' });
    } else {
      next('/');
    }
  } else {
    if (to.params.transition) {
      to.meta.transition = to.params.transition;
    } else {
      if (isSameType(to, from)) {
        const toDepth = getDepth(to);
        const fromDepth = getDepth(from);
        to.meta.transition =
          toDepth < fromDepth
            ? 'slide-right'
            : toDepth > fromDepth
              ? 'slide-left'
              : 'fade';
      }
    }
    (to as any).prevPathName = from.name;
    console.log(from.fullPath, ' => ', to.fullPath, to.meta.transition);
    next();
  }
});

const getDepth = (route: RouteLocationNormalizedGeneric): number => {
  return route.fullPath.split('/').length;
};

const isSameType = (
  route1: RouteLocationNormalizedGeneric,
  route2: RouteLocationNormalizedGeneric,
): boolean => {
  const r1 = route1.name?.toString();
  const r2 = route2.name?.toString();
  if (!r1 || !r2) {
    return false;
  }
  const types = ['Photo', 'Song', 'video', 'Book', 'Comic', 'Source'];
  for (const type of types) {
    if (r1.startsWith(type) && r2.startsWith(type)) {
      return true;
    }
  }
  return false;
};
