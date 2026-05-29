<template>
  <span class="membership-corner-badge" aria-hidden="true" />
</template>

<style scoped>
.membership-corner-badge {
  position: absolute;
  right: 3px;
  bottom: 3px;
  z-index: 1;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd54f 0%, #ffbf00 45%, #f7931e 100%);
  box-shadow:
    0 0 0 1px rgba(255, 191, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}
</style>
