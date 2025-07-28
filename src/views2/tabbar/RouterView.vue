<script setup lang="ts"></script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </transition>
  </router-view>
  <!-- <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view> -->
</template>

<style scoped lang="less">
.fade-enter-active {
  transition: opacity 0.1s ease;
}
.fade-leave-active {
  transition: opacity 0.05s ease;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
