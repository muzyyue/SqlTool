<template>
  <a-layout class="main-layout">
    <!-- 顶部导航 -->
    <a-layout-header class="header">
      <div class="header-content">
        <div class="logo">
          <h1>在线工具箱</h1>
          <span class="version">v2.0</span>
        </div>

        <div class="nav-menu">
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="horizontal"
            :theme="menuTheme"
            @click="handleMenuClick"
          >
            <a-menu-item key="home">
              <template #icon>
                <HomeOutlined />
              </template>
              工具箱
            </a-menu-item>
            <a-menu-item key="sql-tool">
              <template #icon>
                <DatabaseOutlined />
              </template>
              SQL工具
            </a-menu-item>
          </a-menu>
        </div>

        <div class="header-actions">
          <a-button type="text" @click="toggleTheme" class="theme-toggle">
            <template #icon>
              <BulbOutlined v-if="!isDark" />
              <BulbFilled v-else />
            </template>
          </a-button>

          <a-dropdown :trigger="['click']">
            <a-button type="text" class="settings-btn">
              <template #icon>
                <SettingOutlined />
              </template>
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="showSettings">
                  <template #icon>
                    <ToolOutlined />
                  </template>
                  系统设置
                </a-menu-item>
                <a-menu-item @click="exportLogs">
                  <template #icon>
                    <ExportOutlined />
                  </template>
                  导出日志
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item @click="showAbout">
                  <template #icon>
                    <InfoCircleOutlined />
                  </template>
                  关于
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </a-layout-header>

    <!-- 主要内容区域 -->
    <a-layout-content class="content">
      <div class="content-wrapper">
        <!-- 面包屑导航 -->
        <a-breadcrumb class="breadcrumb" v-if="showBreadcrumb">
          <a-breadcrumb-item>在线工具箱</a-breadcrumb-item>
          <a-breadcrumb-item>{{ currentPageTitle }}</a-breadcrumb-item>
        </a-breadcrumb>

        <!-- 页面内容 -->
        <div class="page-content">
          <router-view />
        </div>
      </div>
    </a-layout-content>

    <!-- 底部信息 -->
    <a-layout-footer class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <span>© 2024 在线工具箱 v2.0</span>
          <a-divider type="vertical" />
          <span>基于Vue 3 + Ant Design Vue开发</span>
        </div>
        <div class="footer-right">
          <a href="#" @click.prevent="showFeedback">反馈建议</a>
          <a-divider type="vertical" />
          <a href="#" @click.prevent="showHelp">帮助文档</a>
        </div>
      </div>
    </a-layout-footer>

    <!-- 全局设置模态框 -->
    <a-modal v-model:open="settingsVisible" title="系统设置" width="600px" :footer="null">
      <SettingsPanel @close="settingsVisible = false" />
    </a-modal>

    <!-- 关于模态框 -->
    <a-modal v-model:open="aboutVisible" title="关于SQL生成工具" width="500px" :footer="null">
      <AboutPanel @close="aboutVisible = false" />
    </a-modal>
  </a-layout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  HomeOutlined,
  BulbOutlined,
  BulbFilled,
  SettingOutlined,
  ToolOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons-vue'
import SettingsPanel from './SettingsPanel.vue'
import AboutPanel from './AboutPanel.vue'
import { useThemeStore } from '@/stores/theme.js'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// 响应式数据
const selectedKeys = ref(['home'])
const settingsVisible = ref(false)
const aboutVisible = ref(false)

// 计算属性
const currentPageTitle = computed(() => {
  const routeName = route.name
  switch (routeName) {
    case 'home':
      return '工具箱'
    case 'sql-tool':
      return 'SQL生成工具'
    case 'insert':
      return 'INSERT语句生成'
    case 'update':
      return 'UPDATE语句生成'
    default:
      return '在线工具箱'
  }
})

const showBreadcrumb = computed(() => {
  return route.name !== 'home' && route.name !== 'sql-tool'
})

const menuTheme = computed(() => {
  return isDark.value ? 'dark' : 'light'
})

// 方法
const handleMenuClick = ({ key }) => {
  switch (key) {
    case 'home':
      router.push('/')
      break
    case 'sql-tool':
      router.push('/sql-tool')
      break
    case 'insert':
      router.push('/insert')
      break
    case 'update':
      router.push('/update')
      break
  }
}

const toggleTheme = () => {
  themeStore.toggle()
}

const showSettings = () => {
  settingsVisible.value = true
}

const showAbout = () => {
  aboutVisible.value = true
}

const exportLogs = () => {
  console.log('导出日志')
}

const showFeedback = () => {
  console.log('显示反馈表单')
}

const showHelp = () => {
  console.log('显示帮助文档')
}

// 监听路由变化
watch(
  () => route.name,
  (routeName) => {
    if (routeName) {
      selectedKeys.value = [routeName]
    }
  },
)

// 生命周期
onMounted(() => {
  console.log('MainLayout 已加载')
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, var(--header-gradient-start, #1890ff) 0%, var(--header-gradient-end, #096dd9) 100%);
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background var(--transition-normal, 200ms) ease;
}

[data-theme="dark"] .header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  transition: all var(--transition-normal, 200ms) ease;
}

[data-theme="dark"] .header-content {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  transition: all var(--transition-normal, 200ms) ease;
}

.nav-menu :deep(.ant-menu) {
  background: transparent;
  border: none;
  transition: all var(--transition-normal, 200ms) ease;
}

.nav-menu :deep(.ant-menu-item) {
  color: rgba(255, 255, 255, 0.8);
}

.nav-menu :deep(.ant-menu-item-selected) {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* 暗黑主题下的菜单样式 */
[data-theme="dark"] .nav-menu :deep(.ant-menu-item) {
  color: rgba(255, 255, 255, 0.85);
}

[data-theme="dark"] .nav-menu :deep(.ant-menu-item:hover) {
  color: white;
  background: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .nav-menu :deep(.ant-menu-item-selected) {
  color: #fff;
  background: rgba(22, 119, 255, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle,
.settings-btn {
  color: white !important;
  transition: all var(--transition-normal, 200ms) ease;
}

.theme-toggle:hover,
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

[data-theme="dark"] .theme-toggle,
[data-theme="dark"] .settings-btn {
  color: rgba(255, 255, 255, 0.85) !important;
}

[data-theme="dark"] .theme-toggle:hover,
[data-theme="dark"] .settings-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
}

.content {
  background: var(--bg-secondary, #f5f5f5);
  min-height: calc(100vh - 64px - 70px);
  transition: background var(--transition-normal, 200ms) ease;
}

[data-theme="dark"] .content {
  background: var(--bg-secondary);
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
  background: var(--card-bg, white);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 600px;
  transition: all var(--transition-normal, 200ms) ease;
}

[data-theme="dark"] .page-content {
  background: var(--card-bg);
  box-shadow: var(--shadow-md);
}

.footer {
  background: var(--bg-primary, #001529);
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  padding: 16px 0;
  transition: all var(--transition-normal, 200ms) ease;
}

[data-theme="dark"] .footer {
  background: var(--bg-primary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  text-decoration: none;
  transition: color var(--transition-normal, 200ms) ease;
}

.footer a:hover {
  color: white;
}

[data-theme="dark"] .footer a:hover {
  color: #1677ff;
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

@media (max-width: 480px) {
  .header-content {
    flex-direction: column;
    height: auto;
    padding: 8px 16px;
  }

  .logo {
    margin-bottom: 8px;
  }

  .nav-menu {
    order: 3;
    width: 100%;
    margin-top: 8px;
  }

  .header-actions {
    order: 2;
  }
}
</style>
