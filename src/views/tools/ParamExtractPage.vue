<template>
  <div class="param-extract-page">
    <div class="page-header">
      <h1 class="page-title">
        <SearchOutlined class="title-icon" />
        通用参数提取工具
      </h1>
      <p class="page-description">
        从混合文本中智能识别并提取 SQL 语句和 JSON 参数
      </p>
    </div>

    <div class="main-layout">
      <!-- 左侧：输入区域 -->
      <div class="input-section">
        <TextInputPanel
          v-model="extractor.state.inputText"
          :extract-type="extractor.state.extractType"
          :loading="isLoading"
          :auto-extract="extractor.state.autoExtract"
          :flatten-nested="extractor.state.flattenNested"
          @extract="handleExtract"
          @clear="handleClear"
          @update:extract-type="extractor.switchType"
          @update:auto-extract="(val) => extractor.state.autoExtract = val"
          @update:flatten-nested="(val) => extractor.state.flattenNested = val"
        />
      </div>

      <!-- 右侧：结果区域 -->
      <div class="result-section">
        <!-- 统计栏 -->
        <ExtractStatsBar
          :stats="extractor.state.stats"
          @filter="handleFilter"
        />

        <!-- 结果列表 -->
        <ExtractResultList
          :items="filteredItems"
          :loading="isLoading"
          @select="handleSelectItem"
          @copy="handleCopyItem"
          @copy-all="handleCopyAll"
        />

        <!-- 详情查看器 -->
        <div v-if="hasSelectedItem" class="detail-section">
          <component
            :is="detailComponentType"
            :item="extractor.state.selectedItem"
            class="detail-viewer"
          />
        </div>

        <!-- 空状态提示 -->
        <div v-else-if="!isLoading && !hasResults" class="empty-state">
          <a-empty description="请输入文本并点击提取按钮">
            <template #image>
              <SearchOutlined style="font-size: 64px; color: #ccc" />
            </template>
          </a-empty>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <a-modal
      v-model:open="showErrorModal"
      title="提取错误"
      :footer="null"
    >
      <a-alert
        type="error"
        :message="extractor.state.lastError || '未知错误'"
        show-icon
      />
    </a-modal>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, toRefs } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import TextInputPanel from '@/components/param-extract/TextInputPanel.vue'
import ExtractResultList from '@/components/param-extract/ExtractResultList.vue'
import ExtractStatsBar from '@/components/param-extract/ExtractStatsBar.vue'
import SqlDetailViewer from '@/components/param-extract/SqlDetailViewer.vue'
import JsonDetailViewer from '@/components/param-extract/JsonDetailViewer.vue'
import { useParamExtractor } from '@/composables/useParamExtractor'

const extractor = useParamExtractor()

// 解构并保持响应性
const {
  isLoading,
  filteredItems,
  hasResults,
  hasSelectedItem,
  detailComponentType
} = toRefs(extractor)

const showErrorModal = ref(false)

onMounted(() => {
  // 组件挂载时的初始化逻辑
})

onUnmounted(() => {
  // 清理资源
  extractor.cleanup()
})

/**
 * 处理提取操作
 */
async function handleExtract() {
  await extractor.extract()

  if (extractor.state.lastError) {
    showErrorModal.value = true
    message.error('提取失败，请检查输入内容')
  } else if (hasResults.value) {
    const count = extractor.state.stats.total
    message.success(`成功提取 ${count} 条结果`)
  }
}

/**
 * 处理清空操作
 */
function handleClear() {
  extractor.clearResults()
  message.info('已清空所有结果')
}

/**
 * 处理选择结果项
 */
function handleSelectItem(item) {
  extractor.selectItem(item)
}

/**
 * 复制单条结果
 */
async function handleCopyItem(item) {
  const success = await extractor.copyItem(item)
  if (success) {
    message.success('已复制到剪贴板')
  } else {
    message.error('复制失败')
  }
}

/**
 * 复制全部结果
 */
async function handleCopyAll() {
  const success = await extractor.copyAll()
  if (success) {
    message.success('已复制全部结果到剪贴板')
  } else {
    message.error('复制失败')
  }
}

/**
 * 处理筛选
 */
function handleFilter(filterKey) {
  if (filterKey === 'sql' || filterKey === 'json') {
    extractor.setFilter(filterKey, undefined)
  } else if (filterKey === 'success' || filterKey === 'warning' || filterKey === 'error') {
    extractor.setFilter(undefined, filterKey)
  }
}
</script>

<style lang="scss" scoped>
.param-extract-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  .page-header {
    margin-bottom: 24px;
    text-align: center;

    .page-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;

      .title-icon {
        font-size: 32px;
        color: var(--color-primary);
      }
    }

    .page-description {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }
  }

  .main-layout {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 24px;
    min-height: 600px;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .input-section {
      background: var(--bg-elevated);
      border-radius: 12px;
      border: 1px solid var(--border-default);
      padding: 20px;
      height: fit-content;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      position: sticky;
      top: 80px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;

      @media (max-width: 1024px) {
        position: static;
        max-height: none;
      }
    }

    .result-section {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .detail-section {
        background: var(--bg-elevated);
        border-radius: 12px;
        border: 1px solid var(--border-default);
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

        .detail-viewer {
          width: 100%;
        }
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        background: var(--bg-elevated);
        border-radius: 12px;
        border: 1px solid var(--border-default);
      }
    }
  }
}
</style>
