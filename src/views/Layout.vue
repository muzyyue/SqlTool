<script setup>
import { useRouter, useRoute } from 'vue-router'
import { HomeOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()

const goToHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="layout-container">
    <!-- 返回首页按钮，放在header下方并左对齐 -->
    <div class="back-to-home-container">
      <button
        v-if="route.path !== '/'"
        @click="goToHome"
        class="back-to-home-button"
      >
        <HomeOutlined /> 返回首页
      </button>
    </div>

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f0f2f5;
}

.back-to-home-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 20px;
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  justify-content: flex-start;
}

.back-to-home-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  transition: all 0.3s;
}

.back-to-home-button:hover {
  color: #1890ff;
  border-color: #1890ff;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
