<template>
  <a-layout class="main-layout">
    <!-- 顶部导航 -->
    <a-layout-header class="header">
      <div class="header-content">
        <div class="logo">
          <h1>SQL生成工具</h1>
          <span class="version">v2.0</span>
        </div>

        <div class="nav-menu">
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="horizontal"
            theme="dark"
            @click="handleMenuClick"
          >
            <a-menu-item key="home">
              <template #icon>
                <HomeOutlined />
              </template>
              首页
            </a-menu-item>
            <a-menu-item key="insert">
              <template #icon>
                <InsertRowAboveOutlined />
              </template>
              INSERT生成
            </a-menu-item>
            <a-menu-item key="update">
              <template #icon>
                <EditOutlined />
              </template>
              UPDATE生成
            </a-menu-item>
          </a-menu>
        </div>

        <div class="header-actions">
          <a-button type="text" @click="toggleTheme" class="theme-toggle">
            <template #icon>
              <BulbOutlined v-if="isDarkTheme" />
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
          <a-breadcrumb-item>SQL生成工具</a-breadcrumb-item>
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
          <span>© 2024 SQL生成工具 v2.0</span>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeOutlined,
  InsertRowAboveOutlined,
  EditOutlined,
  BulbOutlined,
  BulbFilled,
  SettingOutlined,
  ToolOutlined,
  ExportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue'
import SettingsPanel from './SettingsPanel.vue'
import AboutPanel from './AboutPanel.vue'

const router = useRouter()
const route = useRoute()

// 响应式数据
const selectedKeys = ref(['home'])
const isDarkTheme = ref(false)
const settingsVisible = ref(false)
const aboutVisible = ref(false)

// 计算属性
const currentPageTitle = computed(() => {
  const routeName = route.name
  switch (routeName) {
    case 'home':
      return '首页'
    case 'insert':
      return 'INSERT语句生成'
    case 'update':
      return 'UPDATE语句生成'
    default:
      return 'SQL生成工具'
  }
})

const showBreadcrumb = computed(() => {
  return route.name !== 'home'
})

// 方法
const handleMenuClick = ({ key }) => {
  switch (key) {
    case 'home':
      router.push('/')
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
  isDarkTheme.value = !isDarkTheme.value

  // 更新CSS变量实现主题切换
  const root = document.documentElement
  if (isDarkTheme.value) {
    // 暗色主题
    root.style.setProperty('--primary-color', '#1890ff')
    root.style.setProperty('--bg-color', '#141414')
    root.style.setProperty('--text-color', '#ffffff')
    root.style.setProperty('--border-color', '#434343')
    root.style.setProperty('--card-bg', '#1f1f1f')
    document.body.style.backgroundColor = '#141414'
    document.body.style.color = '#ffffff'
  } else {
    // 亮色主题
    root.style.setProperty('--primary-color', '#1890ff')
    root.style.setProperty('--bg-color', '#f5f5f5')
    root.style.setProperty('--text-color', '#000000')
    root.style.setProperty('--border-color', '#d9d9d9')
    root.style.setProperty('--card-bg', '#ffffff')
    document.body.style.backgroundColor = '#f5f5f5'
    document.body.style.color = '#000000'
  }

  console.log('切换主题:', isDarkTheme.value ? '暗色' : '亮色')
}

const showSettings = () => {
  settingsVisible.value = true
}

const showAbout = () => {
  aboutVisible.value = true
}

const exportLogs = () => {
  // 实现日志导出功能
  console.log('导出日志')
}

const showFeedback = () => {
  // 实现反馈功能
  console.log('显示反馈表单')
}

const showHelp = () => {
  // 实现帮助文档功能
  console.log('显示帮助文档')
}

// 生命周期
onMounted(() => {
  // 根据当前路由设置选中的菜单项
  const routeName = route.name
  if (routeName) {
    selectedKeys.value = [routeName]
  }
})

// 监听路由变化
router.afterEach((to) => {
  if (to.name) {
    selectedKeys.value = [to.name]
  }
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.nav-menu :deep(.ant-menu-item) {
  color: rgba(255, 255, 255, 0.8);
}

.nav-menu :deep(.ant-menu-item-selected) {
  color: white;
  background: rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.1) !important;
}

.content {
  background: #f5f5f5;
  min-height: calc(100vh - 64px - 70px);
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

.footer {
  background: #001529;
  color: rgba(255, 255, 255, 0.8);
  padding: 16px 0;
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
  color: white;
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
