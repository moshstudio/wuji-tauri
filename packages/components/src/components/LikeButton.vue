<script setup lang="ts">
const props = defineProps<{
  likeAction: (like: boolean) => void;
}>();
const count = defineModel<number>('count', { default: 0 });
const isLiked = defineModel<boolean>('isLiked', { default: false });
function likeAction() {
  if (!isLiked.value) {
    isLiked.value = true;
    count.value++;
    props.likeAction(true);
  }
}
</script>

<template>
  <van-button
    :icon="isLiked ? 'like' : 'like-o'"
    :type="isLiked ? 'primary' : 'default'"
    size="mini"
    :color="isLiked ? 'red' : ''"
    plain
    class="transition-all duration-300 ease-in-out"
    @click.stop="likeAction"
  >
    {{ count }}
  </van-button>
</template>

<style scoped lang="less"></style>
