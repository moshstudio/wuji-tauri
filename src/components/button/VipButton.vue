<script setup lang="ts">
defineProps<{
  isVip: boolean;
  onClick?: () => void;
}>();
</script>

<template>
  <div
    class="vip-badge"
    :class="{ 'vip-active': isVip, 'vip-inactive': !isVip }"
    @click="onClick"
  >
    <span class="vip-text">VIP</span>
    <span v-if="!isVip" class="vip-plus">+</span>
  </div>
</template>

<style scoped>
.vip-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  font-style: italic;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  line-height: 1;
}

.vip-active {
  background: linear-gradient(135deg, #ffbf00, #f7931e);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.vip-inactive {
  background: linear-gradient(135deg, #e4e4e4, #c1c1c1);
  color: #888;
}

.vip-text {
  letter-spacing: 0.5px;
}

.vip-plus {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 800;
}

.vip-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.vip-badge:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
