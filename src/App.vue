<script setup>
import { ref, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { UploadOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useExcelParser } from './composables/useExcelParser'
import { usePinyinConverter } from './composables/usePinyinConverter'
import { useSqlGenerator } from './composables/useSqlGenerator'

const { parseExcel } = useExcelParser()
const { convertHeaders } = usePinyinConverter()
const { generateInsertSql } = useSqlGenerator()

// 定义常用数据库函数列表
  const commonDbFunctions = [
    { label: '系统日期（Oracle）', value: 'sysdate' },
    { label: '系统日期（SQL Server）', value: 'getdate()' },
    { label: '系统日期（MySQL/PostgreSQL）', value: 'now()' },
    { label: '当前用户（Oracle）', value: 'user' },
    { label: '当前用户（SQL Server）', value: 'user_name()' },
    { label: '当前用户（MySQL）', value: 'user()' },
    { label: '当前用户（PostgreSQL）', value: 'current_user' },
    { label: '系统时间戳（Oracle）', value: 'systimestamp' },
    { label: '系统时间戳（SQL Server）', value: 'current_timestamp' },
    { label: '系统时间戳（MySQL）', value: 'current_timestamp()' },
    { label: '系统时间戳（PostgreSQL）', value: 'current_timestamp' },
    { label: '当前会话ID（Oracle）', value: "sys_context('USERENV','SESSIONID')" },
    { label: '当前会话ID（SQL Server）', value: '@@SPID' },
    { label: '当前会话ID（MySQL）', value: 'connection_id()' },
    { label: '当前会话ID（PostgreSQL）', value: 'pg_backend_pid()' }
  ]

  // 状态管理
  const state = reactive({
    tableName: '',
    uploadedFile: null,
    isLoading: false,
    generatedSql: '',
    headers: [], // 存储解析后的表头
    convertedHeaders: [], // 存储转换后的表头（拼音首字母）
    rows: [], // 存储解析后的数据行
    primaryKeyField: '', // 主键字段
    multiValueSeparator: ',', // 多值分隔符
    dynamicFields: [], // 存储动态添加的字段，格式: [{name: '字段名', value: '字段值', function: '数据库函数'}]
    filteredFields: [], // 存储被过滤的字段名
    batchUpdate: {
      fieldName: '', // 要修改的字段名
      oldValue: '', // 要匹配的旧值
      newValue: '' // 要替换的新值
    }
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
    
    // 存储解析后的数据
    state.headers = headers
    state.convertedHeaders = convertedHeaders
    state.rows = rows
    
    // 生成SQL语句
      if (state.tableName) {
        state.generatedSql = generateInsertSql(
      state.tableName, 
      convertedHeaders, 
      rows, 
      state.primaryKeyField, 
      state.multiValueSeparator,
      state.dynamicFields,
      state.filteredFields
    )
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

// 处理主键字段变化
const handlePrimaryKeyChange = (value) => {
  state.primaryKeyField = value
}

// 动态字段相关函数
// 添加动态字段
const addDynamicField = () => {
  if (state.dynamicFields.some(field => field.name === '')) {
    message.warning('请先填写上一个动态字段的名称')
    return
  }
  
  state.dynamicFields.push({ name: '', value: '', function: '' })
  
  // 重新生成SQL语句
  if (state.tableName && state.rows.length > 0) {
    regenerateSql()
  }
}

const removeDynamicField = (index) => {
  state.dynamicFields.splice(index, 1)
}

const updateDynamicFieldName = (index, value) => {
  if (state.dynamicFields[index]) {
    state.dynamicFields[index].name = value
  }
}
const updateDynamicFieldValue = (index, value) => {
    if (state.dynamicFields[index]) {
      state.dynamicFields[index].value = value;
      // 当手动输入值时，清除选择的函数
      if (value) {
        state.dynamicFields[index].function = '';
      }
    }
  };

  // 更新动态字段的函数选择
  const updateDynamicFieldFunction = (index, funcValue) => {
    if (state.dynamicFields[index]) {
      state.dynamicFields[index].function = funcValue;
      // 当选择函数时，清除手动输入的值
      if (funcValue) {
        state.dynamicFields[index].value = '';
      }
    }
  };

  // 过滤字段相关函数
  const toggleFieldFilter = (fieldName) => {
    if (state.filteredFields.includes(fieldName)) {
      // 如果字段已被过滤，取消过滤
      state.filteredFields = state.filteredFields.filter(field => field !== fieldName);
    } else {
      // 如果字段未被过滤，添加到过滤列表
      state.filteredFields.push(fieldName);
    }
    
    // 当过滤字段变化时，重新生成SQL
    if (state.tableName && state.uploadedFile) {
      regenerateSql();
    }
  };

  const isFieldFiltered = (fieldName) => {
    return state.filteredFields.includes(fieldName);
  };

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
    // 直接使用当前的状态数据，避免重新解析Excel文件覆盖用户编辑
    
    // 生成SQL语句
    state.generatedSql = generateInsertSql(
      state.tableName, 
      state.convertedHeaders, 
      state.rows, 
      state.primaryKeyField, 
      state.multiValueSeparator,
      state.dynamicFields,
      state.filteredFields
    )
    
    message.success('SQL语句生成成功')
  } catch (error) {
    message.error(error.message || '生成SQL语句失败')
  } finally {
    state.isLoading = false
  }
}

// 处理数据单元格变化
const handleCellChange = (rowIndex, colIndex, value) => {
  // 更新指定位置的数据
  if (state.rows[rowIndex]) {
    state.rows[rowIndex][colIndex] = value
    
    // 重新生成SQL语句
    if (state.tableName) {
      regenerateSql()
    }
  }
}

// 批量修改字段值
const handleBatchUpdate = () => {
  if (!state.batchUpdate.fieldName) {
    message.warning('请选择要修改的字段')
    return
  }
  
  if (state.batchUpdate.oldValue === '' && state.batchUpdate.oldValue !== 0) {
    message.warning('请输入要匹配的旧值')
    return
  }
  
  // 找到要修改的字段在表头中的索引
  const fieldIndex = state.convertedHeaders.indexOf(state.batchUpdate.fieldName)
  if (fieldIndex === -1) {
    message.error('未找到指定字段')
    return
  }
  
  // 批量修改匹配的字段值
  let updateCount = 0
  state.rows.forEach(row => {
    if (row[fieldIndex] === state.batchUpdate.oldValue) {
      row[fieldIndex] = state.batchUpdate.newValue
      updateCount++
    }
  })
  
  if (updateCount > 0) {
    // 重新生成SQL语句
    if (state.tableName) {
      regenerateSql()
    }
    message.success(`成功修改 ${updateCount} 条记录`)
  } else {
    message.info('未找到匹配的记录')
  }
}

// 清除所有数据和SQL
const clearAll = () => {
  // 重置基本状态
  state.uploadedFile = null
  state.tableName = ''
  state.generatedSql = ''
  state.headers = []
  state.convertedHeaders = []
  state.rows = []
  
  // 重置高级配置
  state.primaryKeyField = ''
  state.multiValueSeparator = ','
  
  // 重置动态字段
  state.dynamicFields = []
  
  // 重置批量修改配置
  state.batchUpdate.fieldName = ''
  state.batchUpdate.oldValue = ''
  state.batchUpdate.newValue = ''
  
  // 重置字段过滤
  state.filteredFields = []
  
  // 重置文件上传组件
  const fileInput = document.querySelector('input[type="file"]')
  if (fileInput) {
    fileInput.value = ''
  }
  
  message.success('已清除所有数据和SQL')
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
            placeholder="请输入表名"
            style="width: 200px; margin-right: 10px;"
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
        <div class="config-item">
          <a-button danger @click="clearAll" :disabled="!state.uploadedFile && !state.generatedSql">
            <template #icon>
              <delete-outlined />
            </template>
            清除
          </a-button>
        </div>
      </div>

      <!-- 一对多数据项配置 -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <div class="config-item">
          <label>主键字段：</label>
          <a-select
            v-model:value="state.primaryKeyField"
            placeholder="选择主键字段"
            style="width: 200px; margin-right: 10px;"
            @change="handlePrimaryKeyChange"
          >
            <a-select-option value="">不设置主键</a-select-option>
            <a-select-option v-for="(header, index) in state.convertedHeaders" :key="index" :value="header">
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px;">({{ state.headers[index] }})</span>
            </a-select-option>
          </a-select>
        </div>
        <div class="config-item">
          <label>多值分隔符：</label>
          <a-input
            v-model:value="state.multiValueSeparator"
            placeholder="如: , ; |"
            style="width: 100px;"
          />
          <span style="color: #999; margin-left: 10px;">用于分割同一个单元格中的多个值</span>
        </div>
      </div>

      <!-- 动态添加字段配置 -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <h3>动态添加字段</h3>
        <div v-for="(field, index) in state.dynamicFields" :key="index" class="dynamic-field-item">
          <a-input
            v-model:value="field.name"
            placeholder="字段名"
            style="width: 150px; margin-right: 10px;"
            @change="updateDynamicFieldName(index, $event.target.value)"
          />
          <a-input
                v-model:value="field.value"
                placeholder="字段值（不填则为NULL）"
                style="width: 200px; margin-right: 10px;"
                @change="updateDynamicFieldValue(index, $event.target.value)"
              />
              <span style="margin-right: 10px;">或选择函数:</span>
              <a-select
                v-model:value="field.function"
                placeholder="选择数据库函数"
                allow-search
                style="width: 200px; margin-right: 10px;"
                @change="updateDynamicFieldFunction(index, $event)"
              >
                <a-select-option v-for="(func, idx) in commonDbFunctions" :key="idx" :value="func.value">
                  {{ func.label }}
                  <span style="color: #999; margin-left: 5px;">({{ func.value }})</span>
                </a-select-option>
              </a-select>
              <a-button danger size="small" @click="removeDynamicField(index)">
                <template #icon>
                  <delete-outlined />
                </template>
              </a-button>
        </div>
        <a-button type="default" @click="addDynamicField" style="margin-top: 10px;">
          <template #icon>
            <plus-outlined />
          </template>
          添加字段
        </a-button>
      </div>

      <!-- 过滤字段配置 -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <h3>过滤字段（取消勾选的字段将不计入SQL语句）</h3>
        <div class="filter-fields-container">
          <div 
            v-for="(header, index) in state.convertedHeaders" 
            :key="index" 
            class="filter-field-item"
          >
            <a-checkbox 
              :checked="!isFieldFiltered(header)"
              @change="toggleFieldFilter(header)"
            >
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px;">({{ state.headers[index] }})</span>
            </a-checkbox>
          </div>
        </div>
      </div>

      <!-- 批量修改字段值配置 -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <div class="config-item">
          <h3>批量修改字段值</h3>
          <p>修改某一个字段的所有符合条件的值</p>
        </div>
        <div class="config-item">
          <a-select
            v-model:value="state.batchUpdate.fieldName"
            placeholder="选择要修改的字段"
            style="width: 200px; margin-right: 10px;"
          >
            <a-select-option v-for="(header, index) in state.convertedHeaders" :key="index" :value="header">
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px;">({{ state.headers[index] }})</span>
            </a-select-option>
          </a-select>
          <span style="margin-right: 10px;">=</span>
          <a-input
            v-model:value="state.batchUpdate.oldValue"
            placeholder="要匹配的旧值"
            style="width: 150px; margin-right: 10px;"
          />
          <span style="margin-right: 10px;">改为</span>
          <a-input
            v-model:value="state.batchUpdate.newValue"
            placeholder="要替换的新值"
            style="width: 150px; margin-right: 10px;"
          />
          <a-button type="primary" @click="handleBatchUpdate">
            批量修改
          </a-button>
        </div>
      </div>

      <!-- 数据编辑区域 -->
      <div class="data-edit-section" v-if="state.rows.length > 0">
        <div class="section-header">
          <h3>数据编辑</h3>
          <p>点击单元格可编辑数据，编辑后自动更新SQL语句</p>
        </div>
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>行号</th>
                <th v-for="(header, index) in state.convertedHeaders" :key="index">
                  {{ header }}
                  <span class="original-header" v-if="state.headers[index]">({{ state.headers[index] }})</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in state.rows" :key="rowIndex">
                <td class="row-number">{{ rowIndex + 1 }}</td>
                <td v-for="(cell, colIndex) in row" :key="colIndex">
                  <a-input
                    v-model:value="state.rows[rowIndex][colIndex]"
                    size="small"
                    @change="handleCellChange(rowIndex, colIndex, $event.target.value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
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
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
}

.config-item {
  display: flex;
  align-items: center;
}

/* 动态字段样式 */
.dynamic-field-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.dynamic-field-item .ant-input {
  margin-right: 10px;
}

.config-section h3 {
  width: 100%;
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.result-section {
  background-color: #fafafa;
  padding: 20px;
  border-radius: 8px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .section-header h3 {
    margin: 0;
    font-size: 18px;
  }

  .section-header p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

.result-header h3 {
  margin: 0;
}

  /* 数据编辑区域样式 */
  .data-edit-section {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
  }

  .data-table-container {
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    background-color: #fff;
  }

  .data-table th,
  .data-table td {
    padding: 8px 12px;
    border: 1px solid #e8e8e8;
  }

  .data-table th {
    background-color: #fafafa;
    font-weight: 600;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .data-table td {
    padding: 4px;
  }

  .data-table .row-number {
    width: 60px;
    text-align: center;
    background-color: #fafafa;
    font-weight: 600;
  }

  .original-header {
    font-size: 12px;
    color: #666;
    margin-left: 5px;
  }

  .ant-input {
    margin: 0;
    width: 100%;
  }

  a-textarea {
    width: 100%;
}
</style>
