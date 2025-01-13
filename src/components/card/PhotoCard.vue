<script setup lang="ts">
import { PhotoItem } from "@/extensions/photo";
import { router } from "@/router";
import { showConfirmDialog } from "vant";
import { ref } from "vue";
import LoadImage from "../LoadImage.vue";

const { item, removable } = defineProps({
  item: {
    type: Object as () => PhotoItem,
    required: true,
  },
  removable: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["remove"]);

const deleteButtonVisible = ref(false);

const onClick = () => {
  router.push({
    name: "PhotoDetail",
    params: { id: item.id, sourceId: item.sourceId },
  });
};

const remove = async () => {
  const dialog = await showConfirmDialog({
    message: "确定从当前收藏夹中删除？",
  });
  if (dialog === "confirm") {
    emit("remove");
  }
};

function onMouseEnter() {
  deleteButtonVisible.value = true;
}
function onMouseLeave() {
  deleteButtonVisible.value = false;
}
</script>

<template>
  <div
    class="flex flex-col m-2 w-[160px] bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <template v-if="typeof item.cover === 'string'">
      <LoadImage
        :width="160"
        :height="200"
        fit="cover"
        lazy-load
        :src="item.cover!"
        :headers="item.coverHeaders || undefined"
        class="rounded-t-lg"
      />
    </template>
    <template v-else>
      <van-image
        width="160"
        height="200"
        fit="cover"
        lazy-load
        :src="item.cover[0]"
        class="rounded-t-lg"
      />
    </template>
    <van-text-ellipsis
      :content="item.title"
      v-tooltip="item.title"
      rows="2"
      class="text-xs p-2 text-[--van-text-color] h-[52px]"
      v-if="item.title"
    />
    <van-button
      icon="delete"
      size="small"
      class="absolute top-2 right-2 opacity-50 hover:opacity-100 hover:bg-red-600 hover:border-red-600 hover:text-white"
      round
      @click.stop="remove"
      v-if="deleteButtonVisible && removable"
    ></van-button>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
