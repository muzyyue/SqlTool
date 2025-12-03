<script setup>
import { ref, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { UploadOutlined, CopyOutlined } from '@ant-design/icons-vue'
import { useExcelParser } from './composables/useExcelParser'
import { usePinyinConverter } from './composables/usePinyinConverter'
import { useSqlGenerator } from './composables/useSqlGenerator'

const { parseExcel } = useExcelParser()
const { convertHeaders } = usePinyinConverter()
const { generateInsertSql } = useSqlGenerator()

// 状态管理
const state = reactive({
  tableName: '',
  uploadedFile: null,
  isLoading: false,
  generatedSql: '',
})

// 处理文件上传
const handleFileUpload = async (file) => {
  // 检查文件格式
  if (!file.name.endsWith('.xlsx')) {
    message.error('只支持.xlsx格式的Excel文件')
    return false
  }

  state.isLoading = true
  state.uploadedFile = file

  try {
    // 解析Excel文件
    const { headers, rows } = await parseExcel(file)
    
    // 转换表头为拼音首字母
    const convertedHeaders = convertHeaders(headers)
    
    // 生成SQL语句
    if (state.tableName) {
      state.generatedSql = generateInsertSql(state.tableName, convertedHeaders, rows)
    }
    
    message.success('Excel文件解析成功')
  } catch (error) {
    message.error(error.message || '解析Excel文件失败')
  } finally {
    state.isLoading = false
  }

  return false // 阻止自动上传，我们在前端处理文件
}

// 处理表名变化
  const handleTableNameChange = (event) => {
    state.tableName = event.target.value
  }

// 重新生成SQL（当表名变化时）
const regenerateSql = async () => {
  if (!state.uploadedFile) {
    message.warning('请先上传Excel文件')
    return
  }

  if (!state.tableName) {
    message.warning('请输入表名')
    return
  }

  state.isLoading = true

  try {
    // 重新解析Excel文件
    const { headers, rows } = await parseExcel(state.uploadedFile)
    
    // 转换表头为拼音首字母
    const convertedHeaders = convertHeaders(headers)
    
    // 生成SQL语句
    state.generatedSql = generateInsertSql(state.tableName, convertedHeaders, rows)
    
    message.success('SQL语句生成成功')
  } catch (error) {
    message.error(error.message || '生成SQL语句失败')
  } finally {
    state.isLoading = false
  }
}

// 复制SQL到剪贴板
const copySqlToClipboard = () => {
  if (!state.generatedSql) {
    message.warning('没有可复制的SQL语句')
    return
  }

  navigator.clipboard.writeText(state.generatedSql).then(() => {
    message.success('SQL语句已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败，请手动复制')
  })
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Excel转SQL工具</h1>
      <p>上传Excel文件，自动生成SQL INSERT语句</p>
    </header>

    <main class="app-main">
      <div class="config-section">
        <div class="config-item">
          <a-input
            v-model:value="state.tableName"
            placeholder="请输入SQL表名"
            style="width: 300px;"
            @change="handleTableNameChange"
          />
        </div>
        <div class="config-item">
          <a-upload
            :before-upload="handleFileUpload"
            :show-upload-list="false"
            accept=".xlsx"
          >
            <a-button type="primary" :loading="state.isLoading">
              <template #icon>
                <upload-outlined />
              </template>
              上传Excel文件
            </a-button>
          </a-upload>
        </div>
        <div class="config-item">
          <a-button type="default" @click="regenerateSql" :disabled="!state.uploadedFile || !state.tableName">
            重新生成SQL
          </a-button>
        </div>
      </div>

      <div class="result-section">
        <div class="result-header">
          <h3>生成的SQL语句</h3>
          <a-button type="primary" @click="copySqlToClipboard" :disabled="!state.generatedSql">
            <template #icon>
              <copy-outlined />
            </template>
            复制到剪贴板
          </a-button>
        </div>
        <a-textarea
          v-model:value="state.generatedSql"
          :rows="15"
          readonly
          placeholder="生成的SQL语句将显示在这里"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-header h1 {
  color: #1890ff;
  margin-bottom: 10px;
}

.config-section {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
}

.config-item {
  display: flex;
  align-items: center;
}

.result-section {
  background-color: #fafafa;
  padding: 20px;
  border-radius: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.result-header h3 {
  margin: 0;
}
</style>
