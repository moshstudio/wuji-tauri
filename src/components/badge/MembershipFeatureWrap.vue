<script setup lang="ts">
import MembershipCornerBadge from '@/components/badge/MembershipCornerBadge.vue';
import { showMembershipBadge } from '@/utils/membershipBadge';

defineProps<{
  feature?: string;
}>();
</script>

<template>
  <span class="membership-feature-wrap relative inline-flex items-center justify-center">
    <slot />
    <MembershipCornerBadge v-if="showMembershipBadge(feature)" />
  </span>
</template>
