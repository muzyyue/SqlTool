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
          <a-breadcrumb-item>
            <router-link to="/" class="breadcrumb-link">在线工具箱</router-link>
          </a-breadcrumb-item>
          <a-breadcrumb-item v-if="currentRouteMeta.parent">
            <router-link
              :to="currentRouteMeta.parent.path"
              class="breadcrumb-link"
            >
              {{ currentRouteMeta.parent.title }}
            </router-link>
          </a-breadcrumb-item>
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
    <a-modal
      v-model:open="settingsVisible"
      title="系统设置"
      width="600px"
      :footer="null"
    >
      <SettingsPanel @close="settingsVisible = false" />
    </a-modal>

    <!-- 关于模态框 -->
    <a-modal
      v-model:open="aboutVisible"
      title="关于SQL生成工具"
      width="500px"
      :footer="null"
    >
      <AboutPanel @close="aboutVisible = false" />
    </a-modal>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  HomeOutlined,
  BulbOutlined,
  BulbFilled,
  SettingOutlined,
  ToolOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
} from "@ant-design/icons-vue";
import SettingsPanel from "./SettingsPanel.vue";
import AboutPanel from "./AboutPanel.vue";
import { useThemeStore } from "@/stores/theme.js";

/**
 * 路由配置类型
 */
interface RouteConfig {
  parent: { path: string; title: string } | null;
}

const router = useRouter();
const route = useRoute();
const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);

// 响应式数据
const selectedKeys = ref(["home"]);
const settingsVisible = ref(false);
const aboutVisible = ref(false);

// 计算属性
const currentPageTitle = computed(() => {
  const routeName = route.name;
  switch (routeName) {
    case "home":
      return "工具箱";
    case "sql-tool":
      return "SQL生成工具";
    case "tool-insertpage":
      return "INSERT语句生成";
    case "tool-updatepage":
      return "UPDATE语句生成";
    default:
      return route.meta?.title || "在线工具箱";
  }
});

const showBreadcrumb = computed(() => {
  return route.name !== "home" && route.name !== "sql-tool";
});

/**
 * 当前路由元信息
 * 用于面包屑导航的父级路由信息
 */
const currentRouteMeta = computed(() => {
  const routeName = route.name;
  const routeConfigs: Record<string, RouteConfig> = {
    "tool-insertpage": {
      parent: { path: "/sql-tool", title: "SQL生成工具" },
    },
    "tool-updatepage": {
      parent: { path: "/sql-tool", title: "SQL生成工具" },
    },
    "tool-jsonpage": {
      parent: { path: "/", title: "工具箱" },
    },
    "tool-timestamppelperpage": {
      parent: { path: "/", title: "工具箱" },
    },
    "tool-excelfillpage": {
      parent: { path: "/", title: "工具箱" },
    },
  };
  return routeConfigs[routeName as string] || { parent: null };
});

const menuTheme = computed(() => {
  return isDark.value ? "dark" : "light";
});

// 方法
const handleMenuClick = ({ key }) => {
  switch (key) {
    case "home":
      router.push("/");
      break;
    case "sql-tool":
      router.push("/sql-tool");
      break;
    case "insert":
      router.push("/sql/insert");
      break;
    case "update":
      router.push("/sql/update");
      break;
  }
};

const toggleTheme = () => {
  themeStore.toggle();
};

const showSettings = () => {
  settingsVisible.value = true;
};

const showAbout = () => {
  aboutVisible.value = true;
};

const exportLogs = () => {
  console.log("导出日志");
};

const showFeedback = () => {
  console.log("显示反馈表单");
};

const showHelp = () => {
  console.log("显示帮助文档");
};

// 监听路由变化
watch(
  () => route.name,
  (routeName) => {
    if (routeName) {
      selectedKeys.value = [routeName];
    }
  },
);

// 生命周期
onMounted(() => {
  console.log("MainLayout 已加载");
});
</script>

<style scoped>
/**
 * 主布局
 * 使用 CSS 变量实现主题切换
 */
.main-layout {
  min-height: 100vh;
}

.header {
  background: linear-gradient(
    135deg,
    var(--header-bg-start) 0%,
    var(--header-bg-end) 100%
  );
  padding: 0;
  box-shadow: var(--shadow-header);
  transition: all var(--transition-normal) ease;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  transition: all var(--transition-normal) ease;
}

.logo {
  display: flex;
  align-items: center;
  color: var(--header-text);
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
  transition: all var(--transition-normal) ease;
}

.nav-menu :deep(.ant-menu) {
  background: transparent;
  border: none;
  transition: all var(--transition-normal) ease;
}

.nav-menu :deep(.ant-menu-item) {
  color: var(--nav-item-text);
}

.nav-menu :deep(.ant-menu-item:hover) {
  color: var(--nav-item-text-hover);
  background: var(--nav-item-bg-hover);
}

.nav-menu :deep(.ant-menu-item-selected) {
  color: var(--nav-item-text-hover);
  background: var(--nav-item-bg-selected);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle,
.settings-btn {
  color: var(--header-text) !important;
  transition: all var(--transition-normal) ease;
}

.theme-toggle:hover,
.settings-btn:hover {
  background: var(--interactive-hover-inverse) !important;
}

.content {
  background: var(--bg-base);
  min-height: calc(100vh - 64px - 70px);
  transition: background var(--transition-normal) ease;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.breadcrumb {
  margin-bottom: 16px;
}

.breadcrumb-link {
  color: var(--text-link);
  text-decoration: none;
  transition: color var(--transition-normal) ease;
}

.breadcrumb-link:hover {
  color: var(--text-link-hover);
}

.page-content {
  background: var(--card-bg);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-sm);
  min-height: 600px;
  transition: all var(--transition-normal) ease;
}

.footer {
  background: linear-gradient(
    135deg,
    var(--header-bg-start) 0%,
    var(--header-bg-end) 100%
  );
  color: var(--header-text-secondary);
  padding: 16px 0;
  transition: all var(--transition-normal) ease;
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
  color: var(--header-text-secondary);
  text-decoration: none;
  transition: color var(--transition-normal) ease;
}

.footer a:hover {
  color: var(--text-link-hover);
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
