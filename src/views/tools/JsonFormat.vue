<template>
  <div class="json-format-page">
    <div class="page-header">
      <h2>JSON 格式化</h2>
      <div class="header-actions">
        <GradientButton type="secondary" size="md" @click="clearAll"> 清空 </GradientButton>
        <GradientButton type="primary" size="md" @click="formatJson"> 格式化 </GradientButton>
      </div>
    </div>

    <div class="content-grid">
      <VbenGlassCard title="输入 JSON" description="输入需要格式化的 JSON 数据">
        <CodeEditor
          v-model="inputJson"
          language="json"
          :theme="isDark ? 'dark' : 'light'"
          placeholder='{"key": "value"}'
        />
      </VbenGlassCard>

      <VbenGlassCard title="格式化结果" description="格式化后的 JSON 数据">
        <CodeEditor
          v-model="outputJson"
          language="json"
          :theme="isDark ? 'dark' : 'light'"
          :readonly="true"
        />
        <div class="output-actions">
          <a-space>
            <a-button size="small" @click="copyOutput">
              <template #icon><CopyOutlined /></template>
              复制
            </a-button>
            <a-button size="small" @click="downloadOutput">
              <template #icon><DownloadOutlined /></template>
              下载
            </a-button>
          </a-space>
        </div>
      </VbenGlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import GradientButton from '@/components/common/GradientButton.vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import { useThemeStore } from '@/stores/theme.js'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const inputJson = ref('')
const outputJson = ref('')

const formatJson = () => {
  try {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }
    const parsed = JSON.parse(inputJson.value)
    outputJson.value = JSON.stringify(parsed, null, 2)
    message.success('格式化成功')
  } catch (error) {
    message.error('JSON 格式错误: ' + error.message)
  }
}

const clearAll = () => {
  inputJson.value = ''
  outputJson.value = ''
  message.success('已清空')
}

const copyOutput = async () => {
  if (!outputJson.value) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(outputJson.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const downloadOutput = () => {
  if (!outputJson.value) {
    message.warning('没有内容可下载')
    return
  }
  const blob = new Blob([outputJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'formatted.json'
  a.click()
  URL.revokeObjectURL(url)
  message.success('下载成功')
}
</script>

<style scoped lang="scss">
.json-format-page {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  @include flex-between;
  margin-bottom: 32px;
}

.page-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.output-actions {
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
}

// 响应式设计
@include respond-to(md) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
