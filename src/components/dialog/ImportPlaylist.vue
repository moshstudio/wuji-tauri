<script setup lang="ts">
import { showLoadingToast, showToast } from 'vant';
import { ref, watch } from 'vue';
import { useSongShelfStore } from '@/store';
import { extractNeteasePlaylistId, playlistDetail } from '@/utils/neteaseMusic';

const show = defineModel<boolean>('show');

const shelfStore = useSongShelfStore();
const link = ref('');

watch(show, (visible) => {
  if (!visible)
    link.value = '';
});

async function beforeClose(action: string): Promise<boolean> {
  if (action !== 'confirm')
    return true;

  const id = extractNeteasePlaylistId(link.value);
  if (!id) {
    showToast('链接无效，请粘贴网易云歌单分享链接');
    return false;
  }

  const toast = showLoadingToast({
    message: '导入中...',
    duration: 0,
    forbidClick: true,
  });

  try {
    const playlist = await playlistDetail(id);
    if (!playlist) {
      showToast('歌单不存在或无法获取');
      return false;
    }

    const shelf = shelfStore.importNeteasePlaylist(playlist);
    if (!shelf) {
      showToast('导入失败，同名歌单已存在');
      return false;
    }

    link.value = '';
    return true;
  }
  catch (error) {
    console.error('[ImportPlaylist]', error);
    showToast('导入失败，请检查网络后重试');
    return false;
  }
  finally {
    toast.close();
  }
}
</script>

<template>
  <van-dialog
    v-model:show="show"
    title="导入歌单"
    show-cancel-button
    close-on-click-overlay
    :before-close="beforeClose"
  >
    <van-cell-group inset>
      <van-cell title="来源" value="网易云音乐" />
      <van-field
        v-model="link"
        rows="3"
        autosize
        type="textarea"
        placeholder="粘贴歌单分享链接或歌单 ID"
      />
      <div class="px-4 py-2 text-xs text-[var(--van-text-color-2)]">
        支持 music.163.com 分享链接，导入后歌曲可通过已配置的音乐源播放
      </div>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
