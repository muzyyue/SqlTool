<template>
  <div class="home-page">
    <!-- 英雄区域 -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">在线工具箱</h1>
        <p class="hero-subtitle">提供多种实用工具，满足不同场景需求</p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ tools.length }}</span>
            <span class="stat-label">个工具</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ categories.length }}</span>
            <span class="stat-label">个分类</span>
          </div>
        </div>
      </div>
      <div class="hero-image">
        <div class="icon-grid">
          <component :is="DatabaseOutlined" class="hero-icon" />
          <component :is="CodeOutlined" class="hero-icon" />
          <component :is="ClockCircleOutlined" class="hero-icon" />
          <component :is="LockOutlined" class="hero-icon" />
        </div>
      </div>
    </div>

    <!-- 工具网格区域 -->
    <div class="tools-section">
      <ToolsGrid />
    </div>

    <!-- 快速访问区域 -->
    <div class="quick-access-section">
      <div class="section-header">
        <h2>快速访问</h2>
        <p>最近使用的工具和热门工具</p>
      </div>
      <div class="quick-access-grid">
        <VbenGlassCard
          v-for="tool in popularTools"
          :key="tool.id"
          :title="tool.name"
          :description="tool.description"
          hoverable
          @click="navigateToTool(tool)"
        >
          <div class="quick-access-content">
            <component :is="iconMap[tool.icon] || DatabaseOutlined" class="tool-icon" />
            <a-button type="link" size="small"> 立即使用 <RightOutlined /> </a-button>
          </div>
        </VbenGlassCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  DatabaseOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  LockOutlined,
  RightOutlined,
  FileExcelOutlined,
  SwapOutlined,
  PlusSquareOutlined,
  AppstoreOutlined,
  SearchOutlined,
  KeyOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  QrcodeOutlined,
  BgColorsOutlined,
} from '@ant-design/icons-vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import ToolsGrid from '@/components/common/ToolsGrid.vue'
import { tools, categories } from '@/config/tools.js'

const router = useRouter()

const popularTools = computed(() => {
  return tools.slice(0, 4)
})

const iconMap = {
  DatabaseOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  LockOutlined,
  FileExcelOutlined,
  SearchOutlined,
  KeyOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  QrcodeOutlined,
  BgColorsOutlined,
  SwapOutlined,
  PlusSquareOutlined,
  AppstoreOutlined,
}

const navigateToTool = (tool) => {
  router.push(tool.route)
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--bg-base);
}

/* 英雄区域 */
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  padding: 80px 0;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-content {
  padding-left: 40px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: var(--card-bg);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-card);
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.hero-image {
  padding-right: 40px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.hero-icon {
  font-size: 48px;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--card-bg);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-card);
}

/* 工具网格区域 */
.tools-section {
  background: var(--bg-elevated);
  padding: 80px 0;
}

/* 快速访问区域 */
.quick-access-section {
  background: var(--bg-base);
  padding: 80px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-header h2 {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.section-header p {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.quick-access-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-access-content .tool-icon {
  font-size: 32px;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--color-primary-bg);
  border-radius: var(--border-radius-md);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .hero-section {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
    padding: 60px 20px;
  }

  .hero-content {
    padding-left: 0;
  }

  .hero-image {
    padding-right: 0;
  }

  .icon-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .quick-access-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 18px;
  }

  .hero-stats {
    flex-direction: column;
    gap: 16px;
  }

  .icon-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .section-header h2 {
    font-size: 28px;
  }

  .section-header p {
    font-size: 16px;
  }

  .quick-access-grid {
    padding: 0 20px;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 40px 15px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .icon-grid {
    grid-template-columns: 1fr;
  }

  .stat-number {
    font-size: 28px;
  }
}
</style>
