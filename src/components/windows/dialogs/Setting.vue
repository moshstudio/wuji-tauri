<script setup lang="ts">
import { router } from '@/router/index';
import { useDisplayStore, useStore } from '@/store';
import { showToast } from 'vant';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

const store = useStore();
const displayStore = useDisplayStore();
const route = useRoute();
const showConfirmClearData = ref(false);
const activeNames = ref([]);
function clearData() {
  store.clearData();
}
const tabBarPages = computed(() => {
  return displayStore.tabBarPages.filter((item) => {
    if (displayStore.isMobileView && item.name === 'Home') {
      return false;
    } else {
      return true;
    }
  });
});
function updateTabBarPages(
  page: {
    name: string;
    chineseName: string;
    enable: boolean;
  },
  checked: boolean,
) {
  if (checked === false && tabBarPages.value.every((item) => !item.enable)) {
    showToast('至少需要保留一个页面');
    page.enable = true;
  }
}
function onConfirm() {
  if (
    !tabBarPages.value
      .filter((item) => item.enable)
      .find((page) => route.path.includes(page.name.toLowerCase()))
  ) {
    router.push({
      name: tabBarPages.value.filter((item) => item.enable)[0].name,
    });
  } else {
    router.push(route.path);
  }
}
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showSettingDialog"
    title="设置"
    :show-cancel-button="false"
    :close-on-click-overlay="false"
    @confirm="onConfirm"
    @touchmove.stop
  >
    <van-cell-group class="mt-2">
      <van-cell center title="深色模式">
        <template #right-icon>
          <van-switch v-model="displayStore.isDark" />
        </template>
      </van-cell>
    </van-cell-group>
    <van-collapse v-model="activeNames">
      <van-collapse-item title="隐藏功能">
        <van-cell-group>
          <van-cell
            v-for="item in tabBarPages"
            :key="item.name"
            :title="item.chineseName"
          >
            <template #right-icon>
              <van-checkbox
                v-model="item.enable"
                shape="square"
                @change="(v) => updateTabBarPages(item, v)"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </van-collapse-item>
    </van-collapse>
    <van-cell-group>
      <van-cell
        center
        title="清除缓存"
        is-link
        @click="() => store.clearCache()"
      />
      <van-cell center is-link @click="showConfirmClearData = true">
        <template #title>
          <p class="text-red">清空数据</p>
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
  <van-action-sheet
    v-model:show="showConfirmClearData"
    teleport="body"
    cancel-text="取消"
    :actions="[
      { name: '确认清空数据?', color: '#ee0a24', callback: clearData },
    ]"
    close-on-click-action
  />
</template>

<style scoped lang="less"></style>
