<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  UploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons-vue'
import { useExcelParser } from '../composables/useExcelParser'
import { usePinyinConverter } from '../composables/usePinyinConverter'
import { useSqlGenerator } from '../composables/useSqlGenerator'

const router = useRouter()
const { parseExcel } = useExcelParser()
const { convertHeaders } = usePinyinConverter()
const { generateInsertSql, parseDdlForFields } = useSqlGenerator()

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
  { label: '生成gyss前缀GUID（Oracle）', value: "CONCAT('gyss',SUBSTR(SYS_GUID(), 1, 28))" },
  { label: '生成gyss前缀GUID（达梦）', value: "CONCAT('gyss',SUBSTR(SYS_GUID(), 1, 28))" },
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
  { label: '达梦多行转一行', value: 'wm_concat' },
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
  selectedRows: [], // 存储选中的行
  primaryKeyField: '', // 主键字段

  dynamicFields: [], // 存储动态添加的字段，格式: [{name: '字段名', value: '字段值', function: '数据库函数', type: '字段类型', startNum: '起始数字', addQuotes: true}],
  filteredFields: [], // 存储被过滤的字段名
  batchUpdate: {
    fieldName: '', // 要修改的字段名
    oldValue: '', // 要匹配的旧值
    newValue: '', // 要替换的新值
  },
  ddlStatement: '', // 存储数据库表DDL语句
  ddlFields: [], // 存储从DDL解析出的字段对象
  fieldMappings: [], // 存储DDL字段与Excel列的映射关系
})

// 处理DDL解析
const handleDdlParse = () => {
  if (!state.ddlStatement) {
    message.warning('请输入DDL语句')
    return
  }

  try {
    state.isLoading = true
    // 解析DDL语句获取字段名和注释
    const fields = parseDdlForFields(state.ddlStatement)
    state.ddlFields = fields

    if (fields.length > 0) {
      message.success(`成功解析出${fields.length}个字段`)

      // 创建字段映射关系
      state.fieldMappings = fields.map((field) => {
        // 尝试自动匹配Excel列（忽略大小写）
        const matchedExcelIndex = state.convertedHeaders.findIndex(
          (header) => header && header.toLowerCase() === field.name.toLowerCase(),
        )
        return {
          ddlField: field,
          excelColumn: matchedExcelIndex !== -1 ? matchedExcelIndex : -1,
        }
      })

      // 如果有转换后的表头，更新过滤字段列表
      if (state.convertedHeaders.length > 0) {
        // 过滤掉不在DDL字段列表中的字段
        const ddlFieldNames = fields.map((f) => f.name.toLowerCase())
        state.filteredFields = state.convertedHeaders.filter(
          (header) => header && !ddlFieldNames.includes(header.toLowerCase()),
        )
      }
    } else {
      message.warning('未从DDL语句中解析出任何字段')
      state.fieldMappings = []
    }
  } catch (error) {
    message.error('解析DDL语句失败: ' + (error.message || '未知错误'))
    state.fieldMappings = []
  } finally {
    state.isLoading = false
  }
}

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
    state.selectedRows = new Array(rows.length).fill(false)

    // 如果已有DDL字段，更新字段映射
    if (state.ddlFields.length > 0) {
      handleDdlParse() // 重新解析DDL以创建新的映射关系
    }

    // 生成SQL语句
    if (state.tableName) {
      regenerateSql()
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
// 字段类型选项
const fieldTypes = [
  { label: '普通值', value: 'normal' },
  { label: '数字递增', value: 'increment' },
  { label: '字段拼接', value: 'concat' },
]

// 添加动态字段
const addDynamicField = () => {
  if (state.dynamicFields.some((field) => field.name === '')) {
    message.warning('请先填写上一个动态字段的名称')
    return
  }

  state.dynamicFields.push({
    name: '',
    value: '',
    function: '',
    type: 'normal',
    startNum: 1,
    addQuotes: true,
  })

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
    state.dynamicFields[index].value = value
    // 当手动输入值时，清除选择的函数
    if (value) {
      state.dynamicFields[index].function = ''
    }
  }
}

// 更新动态字段的类型
const updateDynamicFieldType = (index, type) => {
  if (state.dynamicFields[index]) {
    state.dynamicFields[index].type = type
    // 如果切换到数字递增类型，清除函数和值
    if (type === 'increment') {
      state.dynamicFields[index].function = ''
      state.dynamicFields[index].addQuotes = false
    }
  }
}

// 更新动态字段的起始数字
const updateDynamicFieldStartNum = (index, value) => {
  if (state.dynamicFields[index]) {
    // 确保是数字类型
    const num = parseInt(value) || 1
    state.dynamicFields[index].startNum = num
  }
}

// 更新动态字段是否添加单引号
const updateDynamicFieldQuotes = (index, checked) => {
  if (state.dynamicFields[index]) {
    state.dynamicFields[index].addQuotes = checked
  }
}

// 更新动态字段的函数选择
const updateDynamicFieldFunction = (index, funcValue) => {
  if (state.dynamicFields[index]) {
    state.dynamicFields[index].function = funcValue
    // 当选择函数时，清除手动输入的值
    if (funcValue) {
      state.dynamicFields[index].value = ''
    }
  }
}

// 过滤字段相关函数
const toggleFieldFilter = (fieldName) => {
  if (state.filteredFields.includes(fieldName)) {
    // 如果字段已被过滤，取消过滤
    state.filteredFields = state.filteredFields.filter((field) => field !== fieldName)
  } else {
    // 如果字段未被过滤，添加到过滤列表
    state.filteredFields.push(fieldName)
  }

  // 当过滤字段变化时，重新生成SQL
  if (state.tableName && state.uploadedFile) {
    regenerateSql()
  }
}

const isFieldFiltered = (fieldName) => {
  return state.filteredFields.includes(fieldName)
}

// 重新生成SQL
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
    // 确定要使用的字段列表和数据
    let fieldsToUse = state.convertedHeaders
    let rowsToUse = state.rows

    // 如果有DDL字段映射，使用映射后的字段和数据
    if (state.fieldMappings.length > 0) {
      // 获取所有映射了Excel列的DDL字段
      const mappedFields = state.fieldMappings.filter((mapping) => mapping.excelColumn !== -1)

      if (mappedFields.length > 0) {
        // 使用DDL字段名作为最终字段名
        fieldsToUse = mappedFields.map((mapping) => mapping.ddlField.name)

        // 重新组织数据行，只包含映射的列
        rowsToUse = state.rows.map((row) => {
          return mappedFields.map((mapping) => {
            return row[mapping.excelColumn]
          })
        })
      }
    }

    // 生成SQL语句
    state.generatedSql = generateInsertSql(
      state.tableName,
      fieldsToUse,
      rowsToUse,
      state.primaryKeyField,
      state.dynamicFields,
      state.filteredFields,
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

// 复制选中行
const copySelectedRows = () => {
  const selectedIndices = state.selectedRows.reduce((indices, isSelected, index) => {
    if (isSelected) indices.push(index)
    return indices
  }, [])

  if (selectedIndices.length === 0) {
    message.warning('请先选择要复制的行')
    return
  }

  copyRows(selectedIndices)
}

// 复制所有行
const copyAllRows = () => {
  if (state.rows.length === 0) {
    message.warning('没有数据行可以复制')
    return
  }

  const allIndices = Array.from({ length: state.rows.length }, (_, i) => i)
  copyRows(allIndices)
}

// 复制指定行
const copyRows = (rowIndices) => {
  const rowsToCopy = rowIndices.map((index) => state.rows[index])
  const newRows = [...state.rows]
  const incrementFields = state.dynamicFields.filter((field) => field.type === 'increment')
  const concatFields = state.dynamicFields.filter((field) => field.type === 'concat')

  // 计算起始数字
  const incrementStarts = {}
  incrementFields.forEach((field) => {
    incrementStarts[field.name] = field.startNum || 1
  })

  // 复制行并应用动态字段规则
  rowsToCopy.forEach((originalRow, copyIndex) => {
    const newRow = [...originalRow]

    // 应用数字递增规则
    incrementFields.forEach((field) => {
      const fieldIndex = state.convertedHeaders.indexOf(field.name)
      if (fieldIndex !== -1) {
        newRow[fieldIndex] = String(incrementStarts[field.name] + copyIndex)
      }
    })

    // 应用字段拼接规则
    concatFields.forEach((field) => {
      const fieldIndex = state.convertedHeaders.indexOf(field.name)
      if (fieldIndex !== -1 && field.value) {
        const concatValues = field.value.split('+').map((part) => {
          part = part.trim()
          // 检查是否是字段引用（格式：{字段名}）
          if (part.startsWith('{') && part.endsWith('}')) {
            const refField = part.slice(1, -1)
            const refIndex = state.convertedHeaders.indexOf(refField)
            return refIndex !== -1 ? originalRow[refIndex] : ''
          }
          return part
        })
        newRow[fieldIndex] = concatValues.join('')
      }
    })

    newRows.push(newRow)
  })

  // 更新数字递增字段的起始数字，以便下次复制时继续递增
  incrementFields.forEach((field) => {
    const fieldIndex = state.dynamicFields.findIndex((f) => f.name === field.name)
    if (fieldIndex !== -1) {
      state.dynamicFields[fieldIndex].startNum = (field.startNum || 1) + rowsToCopy.length
    }
  })

  state.rows = newRows
  state.selectedRows = new Array(newRows.length).fill(false)
  message.success(`成功复制 ${rowsToCopy.length} 行数据`)
  regenerateSql()
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
  state.rows.forEach((row) => {
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

  navigator.clipboard
    .writeText(state.generatedSql)
    .then(() => {
      message.success('SQL语句已复制到剪贴板')
    })
    .catch(() => {
      message.error('复制失败，请手动复制')
    })
}

// 处理字段映射变化
const updateFieldMapping = (ddlFieldName, excelColumnIndex) => {
  const mappingIndex = state.fieldMappings.findIndex(
    (mapping) => mapping.ddlField.name === ddlFieldName,
  )
  if (mappingIndex !== -1) {
    state.fieldMappings[mappingIndex].excelColumn = excelColumnIndex
  }
}

// 获取Excel列选项
const getExcelColumnOptions = () => {
  // 确保headers不是空数组
  if (!state.headers || state.headers.length === 0) {
    return [
      {
        label: 'NULL',
        value: -1,
      },
    ]
  }

  // 生成有效选项，过滤掉可能的undefined值
  const validOptions = state.headers
    .map((header, index) => {
      // 确保每个选项都有正确的结构
      return {
        label: `${state.convertedHeaders[index] || `列${index + 1}`} (${header || `列${index + 1}`})`,
        value: index,
      }
    })
    .filter(
      (option) => option && typeof option === 'object' && 'value' in option && 'label' in option,
    )

  return validOptions.concat([
    {
      label: 'NULL',
      value: -1,
    },
  ])
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div>
        <h1>生成 INSERT 语句</h1>
        <p>上传Excel文件，自动生成SQL INSERT语句</p>
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
            style="width: 200px; margin-right: 10px"
            @change="handleTableNameChange"
          />
        </div>
        <div class="config-item">
          <a-upload :before-upload="handleFileUpload" :show-upload-list="false" accept=".xlsx">
            <a-button type="primary" :loading="state.isLoading">
              <template #icon>
                <upload-outlined />
              </template>
              上传Excel文件
            </a-button>
          </a-upload>
        </div>
        <div class="config-item">
          <a-button
            type="default"
            @click="regenerateSql"
            :disabled="!state.uploadedFile || !state.tableName"
          >
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

      <!-- DDL解析配置 -->
      <div class="config-section">
        <div
          class="config-item"
          style="width: 100%; display: flex; flex-direction: column; align-items: flex-start"
        >
          <label>数据库表DDL语句：</label>
          <a-textarea
            v-model:value="state.ddlStatement"
            placeholder="请输入CREATE TABLE语句或其他包含字段定义的DDL语句"
            rows="5"
            style="width: 100%; margin-top: 10px; margin-bottom: 10px"
          />
          <div style="display: flex; align-items: center; gap: 16px; margin-top: 10px">
            <a-button type="primary" @click="handleDdlParse" :loading="state.isLoading">
              解析DDL生成字段列表
            </a-button>
            <span style="color: #999; font-size: 14px; line-height: 1.5">
              解析后将自动过滤掉不在DDL字段列表中的字段
            </span>
          </div>
        </div>
        <div class="config-item" v-if="state.ddlFields.length > 0">
          <label>解析出的字段及映射（从DDL获取）：</label>
          <div
            class="ddl-fields-container"
            style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px"
          >
            <div
              v-for="(mapping, index) in state.fieldMappings"
              :key="index"
              class="field-mapping-item"
              style="display: flex; align-items: center; gap: 10px"
            >
              <div style="min-width: 150px">
                <strong>{{ mapping.ddlField.name }}</strong>
                <span v-if="mapping.ddlField.comment" style="color: #999; margin-left: 5px"
                  >({{ mapping.ddlField.comment }})</span
                >
              </div>
              <span style="margin-right: 10px">映射到Excel列：</span>
              <a-select
                v-model:value="mapping.excelColumn"
                style="width: 250px"
                @change="updateFieldMapping(mapping.ddlField.name, $event)"
              >
                <a-select-option
                  v-for="option in getExcelColumnOptions()"
                  :key="option?.value"
                  :value="option?.value"
                >
                  {{ option?.label }}
                </a-select-option>
              </a-select>
            </div>
          </div>
        </div>
      </div>

      <!-- 动态添加字段配置 -->
      <div class="config-section" v-if="state.convertedHeaders.length > 0">
        <h3>动态添加字段</h3>
        <div v-for="(field, index) in state.dynamicFields" :key="index" class="dynamic-field-item">
          <a-input
            v-model:value="field.name"
            placeholder="字段名"
            style="width: 150px; margin-right: 10px"
            @change="updateDynamicFieldName(index, $event.target.value)"
          />
          <a-input
            v-model:value="field.value"
            placeholder="字段值（不填则为NULL）"
            style="width: 200px; margin-right: 10px"
            @change="updateDynamicFieldValue(index, $event.target.value)"
          />
          <span style="margin-right: 10px">或选择函数:</span>
          <a-select
            v-model:value="field.function"
            placeholder="选择数据库函数"
            allow-search
            style="width: 300px; margin-right: 10px"
            @change="updateDynamicFieldFunction(index, $event)"
            :disabled="field.type === 'increment'"
          >
            <a-select-option v-for="(func, idx) in commonDbFunctions" :key="idx" :value="func.value"
              >{{ func.label }}
              <span style="color: #999; margin-left: 5px">({{ func.value }})</span>
            </a-select-option>
          </a-select>
          <span style="margin-right: 10px">字段类型:</span>
          <a-select
            v-model:value="field.type"
            style="width: 120px; margin-right: 10px"
            @change="updateDynamicFieldType(index, $event)"
          >
            <a-select-option v-for="type in fieldTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </a-select-option>
          </a-select>
          <span v-if="field.type === 'increment'" style="margin-right: 10px">起始数字:</span>
          <a-input-number
            v-if="field.type === 'increment'"
            v-model:value="field.startNum"
            :min="1"
            style="width: 100px; margin-right: 10px"
            @change="updateDynamicFieldStartNum(index, $event)"
          />
          <span v-if="field.type === 'concat'" style="margin-right: 10px"
            >拼接规则 (使用+连接，字段引用格式: {字段名}):</span
          >
          <a-input
            v-if="field.type === 'concat'"
            v-model:value="field.value"
            placeholder="例如: {name}_{id}"
            style="width: 250px; margin-right: 10px"
            @change="updateDynamicFieldValue(index, $event.target.value)"
          />
          <a-checkbox
            v-model:checked="field.addQuotes"
            style="margin-right: 10px"
            @change="updateDynamicFieldQuotes(index, $event.target.checked)"
            >添加单引号</a-checkbox
          >
          <a-button danger size="small" @click="removeDynamicField(index)"
            ><template #icon>
              <delete-outlined />
            </template>
          </a-button>
        </div>
        <a-button type="default" @click="addDynamicField" style="margin-top: 10px">
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
            <a-checkbox :checked="!isFieldFiltered(header)" @change="toggleFieldFilter(header)">
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px"
                >({{ state.headers[index] }})</span
              >
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
            style="width: 200px; margin-right: 10px"
          >
            <a-select-option
              v-for="(header, index) in state.convertedHeaders"
              :key="index"
              :value="header"
            >
              {{ header }}
              <span v-if="state.headers[index]" style="color: #999; margin-left: 5px"
                >({{ state.headers[index] }})</span
              >
            </a-select-option>
          </a-select>
          <span style="margin-right: 10px">=</span>
          <a-input
            v-model:value="state.batchUpdate.oldValue"
            placeholder="要匹配的旧值"
            style="width: 150px; margin-right: 10px"
          />
          <span style="margin-right: 10px">改为</span>
          <a-input
            v-model:value="state.batchUpdate.newValue"
            placeholder="要替换的新值"
            style="width: 150px; margin-right: 10px"
          />
          <a-button type="primary" @click="handleBatchUpdate"> 批量修改 </a-button>
        </div>
      </div>

      <!-- 数据编辑区域 -->
      <div class="data-edit-section" v-if="state.rows.length > 0">
        <div class="section-header">
          <h3>数据编辑</h3>
          <div>
            <a-button type="default" @click="copySelectedRows" style="margin-right: 10px">
              <template #icon>
                <copy-outlined />
              </template>
              复制选中行
            </a-button>
            <a-button type="default" @click="copyAllRows">
              <template #icon>
                <copy-outlined />
              </template>
              复制所有行
            </a-button>
          </div>
        </div>
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>选择</th>
                <th>行号</th>
                <th v-for="(header, index) in state.convertedHeaders" :key="index">
                  {{ header }}
                  <span class="original-header" v-if="state.headers[index]"
                    >({{ state.headers[index] }})</span
                  >
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in state.rows" :key="rowIndex">
                <td>
                  <a-checkbox v-model:checked="state.selectedRows[rowIndex]"></a-checkbox>
                </td>
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

/* DDL解析区域样式 */
.field-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.field-tag {
  display: inline-block;
  padding: 4px 10px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 12px;
  font-size: 12px;
  color: #1890ff;
  white-space: nowrap;
}

/* 响应式样式优化 */
@media (max-width: 768px) {
  .config-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .dynamic-field-item {
    flex-wrap: wrap;
  }

  .filter-fields-container {
    flex-direction: column;
  }
}
</style>
