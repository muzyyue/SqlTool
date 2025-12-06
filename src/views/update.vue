<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { UploadOutlined, CopyOutlined, DeleteOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useExcelParser } from '../composables/useExcelParser'
import { usePinyinConverter } from '../composables/usePinyinConverter'
import { useSqlGenerator } from '../composables/useSqlGenerator'

const router = useRouter()
const { parseExcel } = useExcelParser()
const { convertHeaders } = usePinyinConverter()
const { generateUpdateSql } = useSqlGenerator()

// 返回首页
const goBackToHome = () => {
  router.push('/')
}

// 定义常用数据库函数列表
const commonDbFunctions = [
  { label: '系统日期（Oracle）', value: 'sysdate' },
  { label: '系统日期（SQL Server）', value: 'getdate()' },
  { label: '系统日期（MySQL/PostgreSQL）', value: 'now()' },
  { label: '系统日期（达梦）', value: 'sysdate' },
  { label: '当前用户（Oracle）', value: 'user' },
  { label: '当前用户（SQL Server）', value: 'user_name()' },
  { label: '当前用户（MySQL）', value: 'user()' },
  { label: '当前用户（PostgreSQL）', value: 'current_user' },
  { label: '当前用户（达梦）', value: 'user' },
  { label: '系统时间戳（Oracle）', value: 'systimestamp' },
  { label: '系统时间戳（SQL Server）', value: 'current_timestamp' },
  { label: '系统时间戳（MySQL）', value: 'current_timestamp()' },
  { label: '系统时间戳（PostgreSQL）', value: 'current_timestamp' },
  { label: '系统时间戳（达梦）', value: 'sysdate' },
  { label: '当前会话ID（Oracle）', value: "sys_context('USERENV','SESSIONID')" },
  { label: '当前会话ID（SQL Server）', value: '@@SPID' },
  { label: '当前会话ID（MySQL）', value: 'connection_id()' },
  { label: '当前会话ID（PostgreSQL）', value: 'pg_backend_pid()' },
  { label: '当前会话ID（达梦）', value: 'sessid' },
  { label: '达梦自增序列', value: 'SYS_GUID()' },
  { label: '达梦字符串长度', value: 'length' },
  { label: '达梦当前日期', value: 'CURRENT_DATE' },
  { label: '达梦当前时间', value: 'CURRENT_TIME' },
  { label: '达梦当前时间戳', value: 'CURRENT_TIMESTAMP' },
  { label: '达梦转换为日期', value: 'to_date' },
  { label: '达梦转换为字符', value: 'to_char' },
  { label: '达梦转换为数值', value: 'to_number' },
  { label: '达梦字符串拼接', value: 'concat' },
  { label: '达梦空值处理', value: 'nvl' },
  { label: '达梦多行转一行', value: 'wm_concat' }
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
  primaryKeyFields: [], // 主键字段列表，用于WHERE条件
  dynamicFields: [], // 存储动态添加的字段，格式: [{name: '字段名', value: '字段值', function: '数据库函数', type: '字段类型', startNum: '起始数字', addQuotes: true}]
  filteredFields: [], // 存储被过滤的字段名
  batchUpdate: {
    fieldName: '', // 要修改的字段名
    oldValue: '', // 要匹配的旧值
    newValue: '' // 要替换的新值
  }
})

// 字段类型选项
const fieldTypes = [
  { label: '普通值', value: 'normal' },
  { label: '数字递增', value: 'increment' }
]

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
const handlePrimaryKeyChange = (values) => {
  state.primaryKeyFields = values || []
}

// 自定义函数处理SQL生成并更新状态
const handleGenerateUpdateSql = () => {
  try {
    // 检查必要的参数
    if (!state.tableName) {
      message.warning('请输入表名');
      return;
    }

    if (!state.uploadedFile) {
      message.warning('请先上传Excel文件');
      return;
    }

    if (state.primaryKeyFields.length === 0) {
      message.warning('请至少选择一个主键字段作为WHERE条件');
      return;
    }

    // 设置加载状态
    state.isLoading = true;

    // 调用SQL生成函数并存储结果
    state.generatedSql = generateUpdateSql(
      state.tableName,
      state.headers,
      state.rows,
      state.primaryKeyFields,
      ',',
      state.dynamicFields,
      state.filteredFields
    );

    // 如果成功生成SQL
    if (state.generatedSql) {
      message.success('SQL语句生成成功');
    } else {
      message.warning('未生成任何SQL语句，请检查数据');
    }
  } catch (error) {
    message.error('生成SQL语句时出错: ' + (error.message || '未知错误'));
    state.generatedSql = '';
  } finally {
    state.isLoading = false;
  }
}

// 动态字段相关函数
// 添加动态字段
const addDynamicField = () => {
  if (state.dynamicFields.some(field => field.name === '')) {
    message.warning('请先填写上一个动态字段的名称')
    return
  }

  state.dynamicFields.push({ name: '', value: '', function: '', type: 'normal', startNum: 1, addQuotes: true })
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

// 更新动态字段的类型
const updateDynamicFieldType = (index, type) => {
  if (state.dynamicFields[index]) {
    state.dynamicFields[index].type = type;
    // 如果切换到数字递增类型，清除函数和值
    if (type === 'increment') {
      state.dynamicFields[index].function = '';
      state.dynamicFields[index].addQuotes = false;
    }
  }
};

// 更新动态字段的起始数字
const updateDynamicFieldStartNum = (index, value) => {
  if (state.dynamicFields[index]) {
    // 确保是数字类型
    const num = parseInt(value) || 1;
    state.dynamicFields[index].startNum = num;
  }
};

// 更新动态字段是否添加单引号
const updateDynamicFieldQuotes = (index, checked) => {
  if (state.dynamicFields[index]) {
    state.dynamicFields[index].addQuotes = checked;
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
};

const isFieldFiltered = (fieldName) => {
  return state.filteredFields.includes(fieldName);
};

// 处理数据单元格变化
const handleCellChange = (rowIndex, colIndex, value) => {
  // 更新指定位置的数据
  if (state.rows[rowIndex]) {
    state.rows[rowIndex][colIndex] = value
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
  state.primaryKeyFields = []

  // 重置动态字段
  state.dynamicFields = []

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
      <div>
        <h1>生成 UPDATE 语句</h1>
        <p>上传Excel文件，自动生成SQL UPDATE语句</p>
      </div>
    </header>

    <div class="back-button-container">
      <a-button @click="goBackToHome" type="default">
        <template #icon>
          <arrow-left-outlined />
        </template>
        返回首页
      </a-button>
    </div>

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
          <a-button type="default" @click="handleGenerateUpdateSql" :disabled="!state.uploadedFile || !state.tableName || state.primaryKeyFields.length === 0">
            生成UPDATE语句
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

      <!-- 主键字段配置（用于WHERE条件） -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <div class="config-item">
          <label>主键字段（用于WHERE条件）：</label>
          <a-select
            v-model:value="state.primaryKeyFields"
            placeholder="选择主键字段"
            mode="multiple"
            style="width: 400px; margin-right: 10px;"
            @change="handlePrimaryKeyChange"
          >
            <a-select-option v-for="(header, index) in state.convertedHeaders" :key="index" :value="header">
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px;">({{ state.headers[index] }})</span>
            </a-select-option>
          </a-select>
          <span style="color: #999;">（可多选，将作为WHERE条件）</span>
        </div>
      </div>

      <!-- 动态添加字段配置 -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <h3>动态添加字段（将添加到SET子句中）</h3>
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
                style="width: 300px; margin-right: 10px;"
                @change="updateDynamicFieldFunction(index, $event)"
                :disabled="field.type === 'increment'"
              >
                <a-select-option v-for="(func, idx) in commonDbFunctions" :key="idx" :value="func.value"
                  >{{ func.label }}
                  <span style="color: #999; margin-left: 5px;">({{ func.value }})</span>
                </a-select-option>
              </a-select>
              <span style="margin-right: 10px;">字段类型:</span>
              <a-select
                v-model:value="field.type"
                style="width: 120px; margin-right: 10px;"
                @change="updateDynamicFieldType(index, $event)"
              >
                <a-select-option v-for="type in fieldTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </a-select-option>
              </a-select>
              <span v-if="field.type === 'increment'" style="margin-right: 10px;">起始数字:</span>
              <a-input-number
                v-if="field.type === 'increment'"
                v-model:value="field.startNum"
                :min="1"
                style="width: 100px; margin-right: 10px;"
                @change="updateDynamicFieldStartNum(index, $event)"
              />
              <a-checkbox
                v-model:checked="field.addQuotes"
                style="margin-right: 10px;"
                @change="updateDynamicFieldQuotes(index, $event.target.checked)"
              >添加单引号</a-checkbox>
              <a-button danger size="small" @click="removeDynamicField(index)"
                ><template #icon>
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
        <h3>过滤字段（取消勾选的字段将不计入SET子句）</h3>
        <div class="filter-fields-container">
          <div
            v-for="(header, index) in state.convertedHeaders"
            :key="index"
            class="filter-field-item"
          >
            <a-checkbox
              :checked="!isFieldFiltered(header)"
              @change="toggleFieldFilter(header)"
              :disabled="state.primaryKeyFields.includes(header)"
            >
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px;">({{ state.headers[index] }})</span>
              <span v-if="state.primaryKeyFields.includes(header)" style="color: #1890ff; margin-left: 5px;">（主键）</span>
            </a-checkbox>
          </div>
        </div>
      </div>

      <!-- 数据编辑区域 -->
      <div class="data-edit-section" v-if="state.rows.length > 0">
        <div class="section-header">
          <h3>数据编辑</h3>
          <p>点击单元格可编辑数据，编辑后将影响生成的UPDATE语句</p>
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
  margin-bottom: 20px;
  width: 100%;
}

.app-header h1 {
  color: #1890ff;
  margin-bottom: 10px;
}

.back-button-container {
  margin-bottom: 20px;
  text-align: left;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

.app-main {
  max-width: 1000px;
  margin: 0 auto;
  text-align: left;
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
