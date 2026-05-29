<script setup lang="ts">
import type { CastDevice } from '@/utils/cast';

const props = withDefaults(
  defineProps<{
    devices?: CastDevice[];
    loading?: boolean;
    casting?: boolean;
    castingDeviceName?: string;
  }>(),
  {
    devices: () => [],
  },
);

const emit = defineEmits<{
  select: [device: CastDevice];
  refresh: [];
  stop: [];
}>();

const show = defineModel<boolean>('show', { default: false });
</script>

<template>
  <van-action-sheet
    v-model:show="show"
    :title="casting ? '投屏中' : '选择投屏设备'"
    :close-on-click-action="false"
  >
    <div class="max-h-[50vh] overflow-y-auto pb-4">
      <div v-if="casting" class="flex flex-col gap-3 px-4 pb-3">
        <div class="text-sm text-[var(--van-text-color-2)]">
          正在投屏到：{{ castingDeviceName || '未知设备' }}
        </div>
        <van-button block type="danger" plain @click="emit('stop')">
          停止投屏
        </van-button>
        <van-divider>切换设备</van-divider>
      </div>
      <div
        v-if="loading"
        class="flex items-center justify-center py-8 text-sm text-[var(--van-text-color-2)]"
      >
        正在搜索设备…
      </div>
      <div
        v-else-if="!props.devices.length"
        class="flex flex-col items-center gap-3 px-4 py-6 text-sm text-[var(--van-text-color-2)]"
      >
        <span>未发现 DLNA 设备</span>
        <p class="text-center text-xs leading-relaxed">
          小米电视：设置 → 投屏 → 开启「无线投屏」或 DLNA。<br>
          手机与电视须连同一 Wi-Fi（建议同一频段），并关闭路由器 AP 隔离。
        </p>
        <van-button size="small" type="primary" plain @click="emit('refresh')">
          重新搜索（约 10 秒）
        </van-button>
      </div>
      <van-cell-group v-else inset>
        <van-cell
          v-for="device in props.devices"
          :key="device.id"
          :title="device.name"
          :label="device.address"
          is-link
          @click="emit('select', device)"
        >
          <template #value>
            <van-tag v-if="device.isTv" type="primary" plain>
              电视
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </van-action-sheet>
</template>
