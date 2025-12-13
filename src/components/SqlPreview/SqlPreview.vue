<template>
  <div class="sql-preview-container">
    <!-- 预览模式切换 -->
    <div class="preview-controls">
      <div class="control-group">
        <span class="control-label">预览模式：</span>
        <a-radio-group v-model:value="previewMode" size="small">
          <a-radio-button value="formatted">格式化</a-radio-button>
          <a-radio-button value="compressed">压缩</a-radio-button>
        </a-radio-group>
      </div>

      <div class="control-group">
        <span class="control-label">语法高亮：</span>
        <a-switch v-model:checked="syntaxHighlight" size="small" />
      </div>

      <div class="control-group">
        <span class="control-label">显示行号：</span>
        <a-switch v-model:checked="showLineNumbers" size="small" />
      </div>
    </div>

    <!-- SQL预览区域 -->
    <div class="sql-preview-area" :class="{ 'with-line-numbers': showLineNumbers }">
      <div v-if="showLineNumbers" class="line-numbers">
        <span v-for="n in lineCount" :key="n" class="line-number">{{ n }}</span>
      </div>

      <pre
        ref="sqlPre"
        class="sql-code"
        :class="{
          'syntax-highlight': syntaxHighlight,
          'compressed': previewMode === 'compressed'
        }"
      >
        <code>{{ formattedSql }}</code>
      </pre>
    </div>

    <!-- 统计信息 -->
    <div v-if="sqlStats" class="sql-stats">
      <div class="stat-item">
        <span class="stat-label">语句数量：</span>
        <span class="stat-value">{{ sqlStats.statementCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">影响行数：</span>
        <span class="stat-value">{{ sqlStats.affectedRows }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">生成时间：</span>
        <span class="stat-value">{{ sqlStats.generationTime }}ms</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">文件大小：</span>
        <span class="stat-value">{{ formatFileSize(sqlStats.fileSize) }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <a-space>
        <a-button
          type="primary"
          @click="copySql"
          :disabled="!sql"
          :loading="copying"
        >
          <template #icon><CopyOutlined /></template>
          复制SQL
        </a-button>

        <a-button
          @click="downloadSql"
          :disabled="!sql"
        >
          <template #icon><DownloadOutlined /></template>
          下载文件
        </a-button>

        <a-button
          @click="previewInNewWindow"
          :disabled="!sql"
        >
          <template #icon><EyeOutlined /></template>
          新窗口预览
        </a-button>

        <a-dropdown :disabled="!sql">
          <template #overlay>
            <a-menu @click="handleExportMenuClick">
              <a-menu-item key="copy">
                <CopyOutlined /> 复制到剪贴板
              </a-menu-item>
              <a-menu-item key="download">
                <DownloadOutlined /> 下载SQL文件
              </a-menu-item>
              <a-menu-item key="preview">
                <EyeOutlined /> 新窗口预览
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="validate">
                <SafetyOutlined /> 语法验证
              </a-menu-item>
            </a-menu>
          </template>
          <a-button>
            <template #icon><MoreOutlined /></template>
            更多操作
          </a-button>
        </a-dropdown>
      </a-space>
    </div>

    <!-- 语法验证结果 -->
    <div v-if="validationResult" class="validation-result">
      <div class="validation-header">
        <SafetyOutlined />
        <span>语法验证结果</span>
      </div>
      <div class="validation-content" :class="{ 'has-errors': validationResult.hasErrors }">
        <div v-if="validationResult.hasErrors">
          <a-alert
            message="发现语法错误"
            type="error"
            show-icon
          >
            <template #description>
              <ul class="error-list">
                <li v-for="error in validationResult.errors" :key="error.line">
                  第{{ error.line }}行: {{ error.message }}
                </li>
              </ul>
            </template>
          </a-alert>
        </div>
        <div v-else>
          <a-alert
            message="语法验证通过"
            type="success"
            show-icon
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  MoreOutlined,
  SafetyOutlined
} from '@ant-design/icons-vue'
import { useErrorHandler } from '@/composables/useErrorHandler'

const props = defineProps({
  sql: {
    type: String,
    default: ''
  },
  stats: {
    type: Object,
    default: () => ({
      statementCount: 0,
      affectedRows: 0,
      generationTime: 0,
      fileSize: 0
    })
  },
  autoValidate: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['copy', 'download', 'validate'])

const { logError, logInfo, logWarning } = useErrorHandler()

// 响应式数据
const previewMode = ref('formatted')
const syntaxHighlight = ref(true)
const showLineNumbers = ref(true)
const copying = ref(false)
const validationResult = ref(null)

// 计算属性
const formattedSql = computed(() => {
  if (!props.sql) return ''

  if (previewMode.value === 'compressed') {
    // 压缩模式：移除多余空格和换行
    return props.sql
      .replace(/\s+/g, ' ')
      .replace(/;\s*/g, ';\n')
      .trim()
  }

  // 格式化模式：保持原样
  return props.sql
})

const lineCount = computed(() => {
  return formattedSql.value.split('\n').length
})

const sqlStats = computed(() => {
  return {
    statementCount: props.stats.statementCount || 0,
    affectedRows: props.stats.affectedRows || 0,
    generationTime: props.stats.generationTime || 0,
    fileSize: props.stats.fileSize || new Blob([props.sql]).size
  }
})

// 方法
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const copySql = async () => {
  if (!props.sql) {
    message.warning('没有SQL语句可复制')
    return
  }

  copying.value = true

  try {
    await navigator.clipboard.writeText(props.sql)
    message.success('SQL已复制到剪贴板')
    logInfo('SQL语句已复制到剪贴板')
    emit('copy', props.sql)
  } catch (error) {
    message.error('复制失败，请检查浏览器权限')
    logError(error, 'system', { operation: 'copySql' })
  } finally {
    copying.value = false
  }
}

const downloadSql = () => {
  if (!props.sql) {
    message.warning('没有SQL语句可下载')
    return
  }

  try {
    const blob = new Blob([props.sql], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated_sql.sql'
    a.click()
    URL.revokeObjectURL(url)

    message.success('SQL文件下载成功')
    logInfo('SQL语句已下载')
    emit('download', props.sql)
  } catch (error) {
    message.error('下载失败')
    logError(error, 'system', { operation: 'downloadSql' })
  }
}

const previewInNewWindow = () => {
  if (!props.sql) {
    message.warning('没有SQL语句可预览')
    return
  }

  try {
    const newWindow = window.open('', '_blank')
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SQL预览</title>
        <style>
          body { font-family: Consolas, Monaco, monospace; padding: 20px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h3>生成的SQL语句预览</h3>
        <pre><code>${props.sql.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
      </body>
      </html>
    `)
    newWindow.document.close()

    logInfo('在新窗口预览SQL语句')
  } catch (error) {
    message.error('新窗口预览失败，请检查浏览器弹出窗口设置')
    logError(error, 'system', { operation: 'previewInNewWindow' })
  }
}

const validateSqlSyntax = async () => {
  if (!props.sql) {
    validationResult.value = null
    return
  }

  try {
    // 简单的SQL语法验证（实际可以集成更复杂的验证库）
    const errors = []
    const lines = props.sql.split('\n')

    lines.forEach((line, index) => {
      const lineNumber = index + 1
      const trimmedLine = line.trim()

      // 检查基本的SQL语法问题
      if (trimmedLine && !trimmedLine.endsWith(';') && !trimmedLine.startsWith('--')) {
        // 忽略注释行和空行
        if (!trimmedLine.startsWith('/*') && !trimmedLine.endsWith('*/')) {
          errors.push({
            line: lineNumber,
            message: '语句缺少分号结尾'
          })
        }
      }

      // 检查常见的语法错误
      if (trimmedLine.toLowerCase().includes('insert') && !trimmedLine.toLowerCase().includes('values')) {
        errors.push({
          line: lineNumber,
          message: 'INSERT语句缺少VALUES关键字'
        })
      }

      if (trimmedLine.toLowerCase().includes('update') && !trimmedLine.toLowerCase().includes('set')) {
        errors.push({
          line: lineNumber,
          message: 'UPDATE语句缺少SET关键字'
        })
      }
    })

    validationResult.value = {
      hasErrors: errors.length > 0,
      errors: errors
    }

    emit('validate', validationResult.value)

    if (errors.length > 0) {
      logWarning('SQL语法验证发现错误', 'validation', { errors })
    } else {
      logInfo('SQL语法验证通过')
    }
  } catch (error) {
    message.error('语法验证失败')
    logError(error, 'system', { operation: 'validateSqlSyntax' })
  }
}

const handleExportMenuClick = ({ key }) => {
  switch (key) {
    case 'copy':
      copySql()
      break
    case 'download':
      downloadSql()
      break
    case 'preview':
      previewInNewWindow()
      break
    case 'validate':
      validateSqlSyntax()
      break
  }
}

// 监听SQL变化，自动验证
watch(() => props.sql, (newSql, oldSql) => {
  if (newSql && newSql !== oldSql && props.autoValidate) {
    validateSqlSyntax()
  }
}, { immediate: true })

// 暴露方法给父组件
defineExpose({
  copySql,
  downloadSql,
  validateSqlSyntax,
  previewInNewWindow
})
</script>

<style scoped>
.sql-preview-container {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 12px;
  color: #666;
}

.sql-preview-area {
  position: relative;
  overflow: auto;
  max-height: 400px;
  background: #f8f9fa;
}

.sql-preview-area.with-line-numbers {
  display: flex;
}

.line-numbers {
  background: #e9ecef;
  padding: 12px 8px;
  border-right: 1px solid #dee2e6;
  text-align: right;
  user-select: none;
  min-width: 40px;
}

.line-number {
  display: block;
  font-size: 12px;
  color: #6c757d;
  line-height: 1.5;
}

.sql-code {
  margin: 0;
  padding: 12px 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
  min-height: 200px;
}

.sql-code.compressed {
  white-space: pre;
  word-break: normal;
}

.sql-code.syntax-highlight {
  color: #24292e;
}

.sql-code.syntax-highlight code {
  /* SQL关键字 */
  :global(.sql-keyword) {
    color: #d73a49;
    font-weight: bold;
  }

  /* 字符串 */
  :global(.sql-string) {
    color: #032f62;
  }

  /* 数字 */
  :global(.sql-number) {
    color: #005cc5;
  }

  /* 注释 */
  :global(.sql-comment) {
    color: #6a737d;
    font-style: italic;
  }

  /* 表名 */
  :global(.sql-table) {
    color: #22863a;
  }

  /* 字段名 */
  :global(.sql-column) {
    color: #6f42c1;
  }
}

.sql-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  border-bottom: 1px solid #dee2e6;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6c757d;
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.action-buttons {
  padding: 16px;
  background: white;
  border-top: 1px solid #d9d9d9;
}

.validation-result {
  border-top: 1px solid #d9d9d9;
}

.validation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fafafa;
  font-weight: 600;
}

.validation-content {
  padding: 16px;
}

.validation-content.has-errors {
  background: #fff2f0;
}

.error-list {
  margin: 0;
  padding-left: 20px;
}

.error-list li {
  margin-bottom: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preview-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .sql-stats {
    flex-wrap: wrap;
    gap: 12px;
  }

  .stat-item {
    flex: 1 0 45%;
  }

  .action-buttons :deep(.ant-space) {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .stat-item {
    flex: 1 0 100%;
  }

  .sql-preview-area {
    max-height: 300px;
  }
}
</style>
