<template>
  <div class="timestamp-page">
    <div class="page-header">
      <h2>时间戳转换</h2>
      <div class="header-actions">
        <GradientButton type="secondary" size="md" @click="clearAll"> 清空 </GradientButton>
        <GradientButton type="primary" size="md" @click="convertTimestamp"> 转换 </GradientButton>
      </div>
    </div>

    <div class="content-grid">
      <VbenGlassCard title="时间戳转日期" description="将时间戳转换为可读的日期时间格式">
        <div class="input-group">
          <a-input
            v-model:value="timestampInput"
            placeholder="请输入时间戳（毫秒）"
            size="large"
            @change="handleTimestampChange"
          >
            <template #suffix>
              <span class="input-suffix">ms</span>
            </template>
          </a-input>
          <div v-if="timestampResult" class="result-display">
            <label>转换结果：</label>
            <a-input :value="timestampResult" readonly />
            <a-button size="small" @click="copyTimestampResult">
              <template #icon><CopyOutlined /></template>
              复制
            </a-button>
          </div>
        </div>
      </VbenGlassCard>

      <VbenGlassCard title="日期转时间戳" description="将日期时间转换为时间戳格式">
        <div class="input-group">
          <a-date-picker
            v-model:value="dateTimeInput"
            show-time
            placeholder="请选择日期时间"
            size="large"
            @change="handleDateTimeChange"
          />
          <div v-if="dateTimeResult" class="result-display">
            <label>转换结果：</label>
            <a-input :value="dateTimeResult" readonly />
            <a-button size="small" @click="copyDateTimeResult">
              <template #icon><CopyOutlined /></template>
              复制
            </a-button>
          </div>
        </div>
      </VbenGlassCard>

      <VbenGlassCard title="当前时间" description="显示当前时间戳和日期时间">
        <div class="current-time">
          <div class="time-item">
            <label>当前时间戳：</label>
            <a-input :value="currentTime.timestamp" readonly />
          </div>
          <div class="time-item">
            <label>当前日期：</label>
            <a-input :value="currentTime.datetime" readonly />
          </div>
          <div class="time-item">
            <label>ISO 8601：</label>
            <a-input :value="currentTime.iso8601" readonly />
          </div>
          <div class="time-actions">
            <a-button @click="copyCurrentTimestamp">
              <template #icon><CopyOutlined /></template>
              复制时间戳
            </a-button>
            <a-button @click="copyCurrentDateTime">
              <template #icon><CopyOutlined /></template>
              复制日期
            </a-button>
          </div>
        </div>
      </VbenGlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import GradientButton from '@/components/common/GradientButton.vue'
import { useThemeStore } from '@/stores/theme.js'

const themeStore = useThemeStore()
// eslint-disable-next-line no-unused-vars
const { isDark } = storeToRefs(themeStore)

const timestampInput = ref('')
const dateTimeInput = ref(null)
const timestampResult = ref('')
const dateTimeResult = ref('')
const currentTime = ref({
  timestamp: '',
  datetime: '',
  iso8601: '',
})

let timer = null

const handleTimestampChange = () => {
  const timestamp = parseInt(timestampInput.value)
  if (isNaN(timestamp)) {
    timestampResult.value = ''
    return
  }

  const date = new Date(timestamp)
  timestampResult.value = formatDateTime(date)
}

const handleDateTimeChange = (date) => {
  if (!date) {
    dateTimeResult.value = ''
    return
  }

  dateTimeResult.value = date.getTime().toString()
}

const convertTimestamp = () => {
  if (timestampInput.value) {
    handleTimestampChange()
  } else if (dateTimeInput.value) {
    handleDateTimeChange()
  } else {
    message.warning('请输入时间戳或选择日期时间')
  }
}

const copyTimestampResult = async () => {
  if (!timestampResult.value) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(timestampResult.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const copyDateTimeResult = async () => {
  if (!dateTimeResult.value) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(dateTimeResult.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const copyCurrentTimestamp = async () => {
  try {
    await navigator.clipboard.writeText(currentTime.value.timestamp)
    message.success('已复制时间戳')
  } catch {
    message.error('复制失败')
  }
}

const copyCurrentDateTime = async () => {
  try {
    await navigator.clipboard.writeText(currentTime.value.datetime)
    message.success('已复制日期时间')
  } catch {
    message.error('复制失败')
  }
}

const formatDateTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = {
    timestamp: now.getTime().toString(),
    datetime: formatDateTime(now),
    iso8601: now.toISOString(),
  }
}

const clearAll = () => {
  timestampInput.value = ''
  dateTimeInput.value = null
  timestampResult.value = ''
  dateTimeResult.value = ''
  message.success('已清空')
}

onMounted(() => {
  updateCurrentTime()
  timer = setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.timestamp-page {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.input-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.result-display label {
  font-weight: 500;
  color: #666;
}

.current-time {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-item label {
  font-weight: 500;
  color: #666;
}

.time-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.input-suffix {
  color: #999;
  font-size: 12px;
}

/* 暗色主题支持 */
[data-theme='dark'] .result-display,
[data-theme='dark'] .time-actions {
  border-top-color: #374151;
}

[data-theme='dark'] .result-display label,
[data-theme='dark'] .time-item label {
  color: #9ca3af;
}

[data-theme='dark'] .input-suffix {
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 768px) {
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
