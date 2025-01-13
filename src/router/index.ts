import { createWebHashHistory, createRouter, RouteRecordRaw } from "vue-router";
import Home from "@/windows/views/Home.vue";
import PhotoList from "@/windows/views/photo/PhotoList.vue";
import PhotoDetail from "@/windows/views/photo/PhotoDetail.vue";
import Song from "@/windows/views/song/index.vue";
import PlaylistDetail from "@/windows/views/song/PlaylistDetail.vue";
import Book from "@/windows/views/book/index.vue";
import BookDetail from "@/windows/views/book/BookDetail.vue";
import BookRead from "@/windows/views/book/BookRead.vue";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    path: "/home",
    name: "Home",
    component: Home,
    // component: () => import("@/windows/views/Home.vue"),
  },
  {
    path: "/photo",
    name: "Photo",
    component: PhotoList,
  },
  {
    path: "/photo/detail/:sourceId/:id",
    name: "PhotoDetail",
    component: PhotoDetail,
    props: true,
  },
  {
    path: "/song",
    name: "Song",
    component: Song,
    // component: () => import("@/windows/views/song/index.vue"),
  },
  {
    path: "/song/playlist/:sourceId/:playlistId",
    name: "SongPlaylist",
    component: PlaylistDetail,
    props: true,
  },
  {
    path: "/book",
    name: "Book",
    component: Book,
    children: [],
  },
  {
    path: "/book/detail/:sourceId/:bookId",
    name: "BookDetail",
    component: BookDetail,
    props: true,
  },
  {
    path: "/book/read/:sourceId/:bookId/:chapterId",
    name: "BookRead",
    component: BookRead,
    props: true,
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
router.beforeEach((to, from, next) => {
  console.log(from.fullPath, " => ", to.fullPath);
  next();
});
