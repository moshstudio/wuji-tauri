<script setup lang="ts">
import { ref, reactive, watch, PropType } from 'vue';
import { BookItem } from '@/extensions/book';
import { useBookShelfStore } from '@/store';
import { storeToRefs } from 'pinia';

const { book } = defineProps({
  book: {
    type: Object as PropType<BookItem>,
    required: false,
  },
  mode: {
    type: String as PropType<'square' | 'rectangle'>,
    default: 'rectangle',
  },
});

const emit = defineEmits(['showShelf']);

const shelfStore = useBookShelfStore();
const { bookShelf } = storeToRefs(shelfStore);
const numInShelf = ref(0);
const pickShelfDialog = ref(false);

const calcNumInShelf = () => {
  if (!book) return;
  // 在几个书架中
  let count = 0;
  for (const shelf of bookShelf.value) {
    for (const b of shelf.books) {
      if (b.book.id === book.id) {
        count++;
      }
    }
  }
  numInShelf.value = count;
};

const addToShelf = () => {
  if (!book) return;
  if (bookShelf.value.length === 1) {
    shelfStore.addToBookSelf(book);
  } else {
    pickShelfDialog.value = true;
  }
};
const selectAddToShelf = (item: { name: string; id: string }) => {
  if (!book) return;
  shelfStore.addToBookSelf(book, item.id);
  pickShelfDialog.value = false;
};

watch(
  [bookShelf, () => book],
  () => {
    calcNumInShelf();
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <template v-if="!book"></template>
  <template v-else>
    <template v-if="mode === 'rectangle'">
      <van-badge>
        <template #content>
          <p v-if="numInShelf > 0" @click="() => emit('showShelf')">
            {{ numInShelf }}
          </p>
        </template>
        <van-button plain type="primary" size="small" @click="addToShelf">
          加入书架
        </van-button>
      </van-badge>
    </template>
    <template v-else>
      <template v-if="numInShelf === 0">
        <van-button
          icon="plus"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="addToShelf"
        >
          <span>书架</span>
        </van-button>
      </template>
      <template v-else>
        <van-button
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="() => emit('showShelf')"
        >
          <span>已加书架</span>
        </van-button>
      </template>
    </template>
  </template>
  <van-dialog
    v-model:show="pickShelfDialog"
    show-cancel-button
    :showConfirmButton="false"
    title="选择书架"
  >
    <van-cell-group inset>
      <van-cell
        v-for="item in bookShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        title-class="text-center"
        value-class="hidden"
        @click="() => selectAddToShelf({ name: item.name, id: item.id })"
      >
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
