<script setup lang="ts">
import { useDisplayStore, useSongShelfStore } from '@/store';
import { showToast, ActionSheetAction } from 'vant';
import { ref } from 'vue';
import * as netease from '@/utils/neteaseMusic';

enum Source {
  netease = '网易云',
  // qq = 'qq音乐',
}
function extractId(url: string, paramName = 'id'): string | null {
  // 使用正则表达式提取完整的链接
  const urlMatch = url.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) {
    return null; // 如果没有匹配到链接，返回 null
  }

  const fullUrl = urlMatch[0];

  try {
    // 使用 URL 对象解析链接
    const parsedUrl = new URL(fullUrl);
    const searchParams = parsedUrl.searchParams;

    // 从查询参数中提取 id 和 creatorId
    return searchParams.get(paramName);
  } catch (error) {
    console.error('Invalid URL:', error);
    return null; // 如果 URL 解析失败，返回 null
  }
}

const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();

const link = ref('');
const showSelectSource = ref(false);
const selectedSource = ref<Source>(Source.netease);
const onSelectSource = (item: ActionSheetAction) => {
  selectedSource.value = item.name! as Source;
  showSelectSource.value = false;
};
const importAction = async () => {
  const id = extractId(link.value);
  if (!id) {
    showToast('链接无效');
    return false;
  }
  const playlist = await netease.playlistDetail(id);
  if (!playlist) {
    showToast('歌单不存在');
    return false;
  }
  const newShelf = shelfStore.createShelf(playlist.name);
  if (!newShelf) {
    showToast('歌单创建失败');
    return false;
  }
  newShelf.playlist.picUrl = playlist.picUrl;
  newShelf.playlist.picHeaders = playlist.picHeaders;
  newShelf.playlist.desc = playlist.desc;
  newShelf.playlist.list = playlist.list;
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showImportPlaylistDialog"
    title="导入歌单"
    show-cancel-button
    @confirm="importAction"
  >
    <van-cell
      is-link
      title="类型"
      :value="selectedSource"
      @click="showSelectSource = true"
    />

    <van-action-sheet
      teleport="body"
      v-model:show="showSelectSource"
      :actions="Object.values(Source).map((i) => ({ name: i }))"
      @select="onSelectSource"
    />
    <van-field
      v-model="link"
      rows="2"
      autosize
      type="textarea"
      placeholder="请输入分享链接"
    />
  </van-dialog>
</template>

<style scoped lang="less"></style>
