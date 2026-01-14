<template>
  <div class="tools-grid">
    <!-- 搜索和筛选区域 -->
    <div class="tools-header">
      <div class="search-box">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索工具..."
          size="large"
          allow-clear
          @search="handleSearch"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input-search>
      </div>

      <div class="category-filter">
        <a-radio-group v-model:value="selectedCategory" size="large">
          <a-radio-button v-for="category in categories" :key="category.id" :value="category.id">
            <component :is="category.iconComponent" class="category-icon" />
            {{ category.name }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <div class="view-toggle">
        <a-button-group>
          <a-tooltip title="网格视图">
            <a-button
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              @click="viewMode = 'grid'"
            >
              <AppstoreOutlined />
            </a-button>
          </a-tooltip>
          <a-tooltip title="列表视图">
            <a-button
              :type="viewMode === 'list' ? 'primary' : 'default'"
              @click="viewMode = 'list'"
            >
              <BarsOutlined />
            </a-button>
          </a-tooltip>
        </a-button-group>
      </div>
    </div>

    <!-- 收藏夹区域 -->
    <div v-if="favorites.length > 0" class="favorites-section">
      <div class="section-title">
        <StarFilled class="title-icon" />
        <h3>我的收藏</h3>
        <a-button type="link" size="small" @click="clearFavorites"> 清空 </a-button>
      </div>
      <div :class="['tools-container', `tools-container-${viewMode}`]">
        <ToolCard v-for="tool in favorites" :key="tool.id" :tool="tool" @click="handleToolClick" />
      </div>
    </div>

    <!-- 工具列表区域 -->
    <div class="tools-section">
      <div class="section-title">
        <AppstoreOutlined class="title-icon" />
        <h3>{{ selectedCategory === 'all' ? '全部工具' : getCategoryName(selectedCategory) }}</h3>
        <span class="tool-count">{{ filteredTools.length }} 个工具</span>
      </div>

      <div v-if="filteredTools.length === 0" class="empty-state">
        <SearchOutlined class="empty-icon" />
        <h3>未找到相关工具</h3>
        <p>尝试使用其他关键词搜索</p>
      </div>

      <div :class="['tools-container', `tools-container-${viewMode}`]">
        <ToolCard
          v-for="tool in filteredTools"
          :key="tool.id"
          :tool="tool"
          @click="handleToolClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  StarFilled,
  AppstoreOutlined as AppstoreOutlinedIcon,
  FileExcelOutlined,
  DatabaseOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  PlusSquareOutlined,
  CodeOutlined as CodeOutlinedIcon,
} from '@ant-design/icons-vue'
import { categories, searchTools, filterToolsByCategory } from '@/config/tools.js'
import { useFavorites } from '@/composables/useFavorites.js'
import ToolCard from '@/components/common/ToolCard.vue'

const router = useRouter()
const { favorites, clearFavorites } = useFavorites()

const searchQuery = ref('')
const selectedCategory = ref('all')
const viewMode = ref('grid')

/**
 * 分类图标映射
 */
const categoryIconMap = {
  AppstoreOutlined: AppstoreOutlinedIcon,
  FileExcelOutlined: FileExcelOutlined,
  DatabaseOutlined: DatabaseOutlined,
  SwapOutlined: SwapOutlined,
  SafetyCertificateOutlined: SafetyCertificateOutlined,
  PlusSquareOutlined: PlusSquareOutlined,
  CodeOutlined: CodeOutlinedIcon,
  SearchOutlined: SearchOutlined,
}

/**
 * 带图标的分类列表（计算属性保留，用于后续扩展）
 */
// eslint-disable-next-line no-unused-vars
const categoriesWithIcons = computed(() => {
  return categories.map((category) => ({
    ...category,
    iconComponent: categoryIconMap[category.icon] || AppstoreOutlinedIcon,
  }))
})

/**
 * 过滤后的工具列表
 */
const filteredTools = computed(() => {
  let result = filterToolsByCategory(selectedCategory.value)

  if (searchQuery.value) {
    result = searchTools(searchQuery.value)
  }

  return result
})

/**
 * 获取分类名称
 */
const getCategoryName = (categoryId) => {
  const category = categories.find((c) => c.id === categoryId)
  return category ? category.name : ''
}

/**
 * 处理搜索
 */
const handleSearch = () => {
  console.log('搜索:', searchQuery.value)
}

/**
 * 处理工具点击
 */
const handleToolClick = (tool) => {
  console.log('点击工具:', tool.name)
  router.push(tool.route)
}

/**
 * 初始化
 */
onMounted(() => {
  console.log('工具网格已加载')
})
</script>

<style scoped>
.tools-grid {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 头部区域 */
.tools-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.search-box {
  max-width: 600px;
  margin: 0 auto;
}

.category-filter {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 20px;
}

.category-icon {
  margin-right: 8px;
}

.view-toggle {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

/* 区域标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 0 20px;
}

.title-icon {
  font-size: 24px;
  color: #1890ff;
}

.section-title h3 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.tool-count {
  font-size: 14px;
  color: #999;
  font-weight: 400;
}

/* 收藏夹区域 */
.favorites-section {
  margin-bottom: 40px;
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
}

/* 工具区域 */
.tools-section {
  margin-top: 40px;
}

/* 工具容器 */
.tools-container-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 0 20px;
}

.tools-container-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #d9d9d9;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #666;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* 暗色主题支持 */
[data-theme='dark'] .tools-grid {
  background: #0f172a;
}

[data-theme='dark'] .section-title h3 {
  color: #f3f4f6;
}

[data-theme='dark'] .tool-count {
  color: #6b7280;
}

[data-theme='dark'] .favorites-section {
  background: #1e293b;
}

[data-theme='dark'] .empty-icon {
  color: #4b5563;
}

[data-theme='dark'] .empty-state h3 {
  color: #9ca3af;
}

[data-theme='dark'] .empty-state p {
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tools-header {
    gap: 16px;
  }

  .category-filter {
    padding: 0;
  }

  .category-filter :deep(.ant-radio-button-wrapper) {
    margin-bottom: 8px;
  }

  .tools-container-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .tool-count {
    margin-left: 0;
  }
}
</style>
