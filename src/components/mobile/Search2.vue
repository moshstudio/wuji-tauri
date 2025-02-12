<script setup lang="ts">
const searchValue = defineModel({ type: String, required: true });
const emit = defineEmits<{
  (e: 'search', value: string): void;
}>();
</script>
<template>
  <van-search
    ref="searchBar"
    v-model="searchValue"
    placeholder="请输入搜索关键词"
    left-icon=""
    shape="round"
    autofocus
    @click-right-icon="() => emit('search', searchValue)"
    @search="() => emit('search', searchValue)"
    @clear="
      () => {
        searchValue = '';
        emit('search', '');
      }
    "
  >
    <template #right-icon>
      <van-icon name="search" class="van-haptics-feedback" />
    </template>
  </van-search>
</template>

<style scoped lang="less"></style>
