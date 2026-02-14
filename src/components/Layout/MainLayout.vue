<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  HomeOutlined,
  DatabaseOutlined,
  BulbOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { Menu, Button, Dropdown } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme.js'
import { storeToRefs } from 'pinia'
import SettingsPanel from './SettingsPanel.vue'
import AboutPanel from './AboutPanel.vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// 菜单项配置
const menuItems = [
  {
    key: 'home',
    icon: HomeOutlined,
    label: '工具箱',
    path: '/',
  },
  {
    key: 'sql-tool',
    icon: DatabaseOutlined,
    label: 'SQL工具',
    path: '/sql-tool',
  },
]

// 当前选中的菜单项
const selectedKeys = computed(() => {
  const currentPath = route.path
  const matchedItem = menuItems.find((item) =>
    currentPath === item.path || currentPath.startsWith(item.path + '/'),
  )
  return matchedItem ? [matchedItem.key] : ['home']
})

// 菜单主题
const menuTheme = computed(() => (isDark.value ? 'dark' : 'light'))

// 处理菜单点击
const handleMenuClick = ({ key }) => {
  const item = menuItems.find((i) => i.key === key)
  if (item && item.path) {
    router.push(item.path)
  }
}

// 设置面板相关
const showSettings = ref(false)
const openSettings = () => {
  showSettings.value = true
}

// 关于面板相关
const showAbout = ref(false)
const openAbout = () => {
  showAbout.value = true
}

// 处理设置菜单点击
const handleSettingsMenuClick = ({ key }) => {
  if (key === 'settings') {
    openSettings()
  } else if (key === 'about') {
    openAbout()
  }
}

// 设置下拉菜单项
const settingsMenuItems = [
  {
    key: 'settings',
    label: '设置',
  },
  {
    key: 'about',
    label: '关于',
  },
]

onMounted(() => {
  console.log('MainLayout 已加载')
})
</script>

<template>
  <a-layout class="main-layout">
    <!-- 顶部导航栏 -->
    <a-layout-header class="header">
      <div class="header-content">
        <!-- Logo区域 -->
        <div class="logo">
          <h1>在线工具箱</h1>
          <span class="version">v2.0</span>
        </div>

        <!-- 导航菜单 -->
        <div class="nav-menu">
          <a-menu
            :selected-keys="selectedKeys"
            :theme="menuTheme"
            mode="horizontal"
            @click="handleMenuClick"
          >
            <a-menu-item v-for="item in menuItems" :key="item.key">
              <component :is="item.icon" />
              {{ item.label }}
            </a-menu-item>
          </a-menu>
        </div>

        <!-- 右侧操作区 -->
        <div class="header-actions">
          <a-button
            type="text"
            class="theme-toggle"
            @click="themeStore.toggleTheme()"
          >
            <BulbOutlined />
          </a-button>
          <a-dropdown
            :trigger="['click']"
            placement="bottomRight"
            @click="handleSettingsMenuClick"
          >
            <a-button type="text" class="settings-btn">
              <SettingOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="handleSettingsMenuClick">
                <a-menu-item v-for="item in settingsMenuItems" :key="item.key">
                  {{ item.label }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </a-layout-header>

    <!-- 主内容区 -->
    <a-layout-content class="content">
      <div class="content-wrapper">
        <!-- 面包屑导航 -->
        <div class="breadcrumb">
          <a-breadcrumb>
            <a-breadcrumb-item>
              <router-link to="/">首页</router-link>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="route.meta.title">
              {{ route.meta.title }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <!-- 页面内容 -->
        <div class="page-content">
          <router-view />
        </div>
      </div>
    </a-layout-content>

    <!-- 底部页脚 -->
    <a-layout-footer class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <span>© 2024 在线工具箱 v2.0</span>
          <a-divider type="vertical" />
          <span>基于Vue 3 + Ant Design Vue开发</span>
        </div>
        <div class="footer-right">
          <a href="#">反馈建议</a>
          <a-divider type="vertical" />
          <a href="#">帮助文档</a>
        </div>
      </div>
    </a-layout-footer>

    <!-- 设置面板 -->
    <SettingsPanel v-model:visible="showSettings" />

    <!-- 关于面板 -->
    <AboutPanel v-model:visible="showAbout" />
  </a-layout>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .header {
  background: linear-gradient(135deg, #001529 0%, #002140 100%);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  color: white;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.version {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.nav-menu {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-menu :deep(.ant-menu) {
  background: transparent;
  border: none;
}

/* 浅色主题菜单样式 - 使用白色文字 */
.nav-menu :deep(.ant-menu-light .ant-menu-item) {
  color: rgba(255, 255, 255, 0.85) !important;
}

.nav-menu :deep(.ant-menu-light .ant-menu-item:hover) {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.nav-menu :deep(.ant-menu-light .ant-menu-item-selected) {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.2) !important;
}

/* 暗黑主题菜单样式 */
[data-theme="dark"] .nav-menu :deep(.ant-menu-dark .ant-menu-item) {
  color: rgba(255, 255, 255, 0.85) !important;
}

[data-theme="dark"] .nav-menu :deep(.ant-menu-dark .ant-menu-item:hover) {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

[data-theme="dark"] .nav-menu :deep(.ant-menu-dark .ant-menu-item-selected) {
  color: #ffffff !important;
  background: rgba(24, 144, 255, 0.3) !important;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle,
.settings-btn {
  color: white !important;
}

.theme-toggle:hover,
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
}

.content {
  background: #f5f5f5;
  min-height: calc(100vh - 64px - 70px);
}

[data-theme="dark"] .content {
  background: #0f1219;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.breadcrumb {
  margin-bottom: 16px;
}

.page-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 600px;
}

[data-theme="dark"] .page-content {
  background: #1e293b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.footer {
  background: #001529;
  color: rgba(255, 255, 255, 0.8);
  padding: 16px 0;
}

[data-theme="dark"] .footer {
  background: #000c17;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
}

.footer a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
}

.footer a:hover {
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }

  .logo h1 {
    font-size: 18px;
  }

  .content-wrapper {
    padding: 16px;
  }

  .footer-content {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
</style>
