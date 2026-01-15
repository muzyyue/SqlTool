<template>
  <div class="ddl-page">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <h2>DDL语句生成</h2>
      <div class="header-actions">
        <a-button @click="resetAll">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
        <a-button type="primary" @click="generateSql" :loading="generating">
          <template #icon><PlayCircleOutlined /></template>
          生成SQL
        </a-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-grid">
      <!-- 左侧：输入区域 -->
      <div class="input-section">
        <!-- 数据库选择 -->
        <div class="input-card">
          <div class="card-header">
            <h3>目标数据库</h3>
            <a-tooltip title="选择要生成SQL的目标数据库类型">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>
          <a-select
            v-model:value="selectedDatabase"
            style="width: 100%"
            placeholder="请选择数据库类型"
            @change="handleDatabaseChange"
          >
            <a-select-option v-for="db in databaseOptions" :key="db.value" :value="db.value">
              <div class="database-option">
                <span class="db-icon">{{ db.icon }}</span>
                <span class="db-name">{{ db.label }}</span>
                <span class="db-version">{{ db.version }}</span>
              </div>
            </a-select-option>
          </a-select>

          <div v-if="selectedDatabase" class="database-info">
            <a-alert
              :message="getDatabaseInfo(selectedDatabase).name"
              :description="getDatabaseInfo(selectedDatabase).description"
              type="info"
              show-icon
            />
          </div>
        </div>

        <!-- DDL类型选择 -->
        <div class="input-card">
          <div class="card-header">
            <h3>DDL语句类型</h3>
            <a-tooltip title="选择要生成的DDL语句类型">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>
          <a-radio-group
            v-model:value="selectedDdlType"
            button-style="solid"
            @change="handleDdlTypeChange"
          >
            <a-radio-button value="create">CREATE TABLE</a-radio-button>
            <a-radio-button value="alter">ALTER TABLE</a-radio-button>
            <a-radio-button value="update">UPDATE TABLE</a-radio-button>
            <a-radio-button value="drop">DROP TABLE</a-radio-button>
            <a-radio-button value="truncate">TRUNCATE TABLE</a-radio-button>
          </a-radio-group>
        </div>

        <!-- DDL输入区域 -->
        <div class="input-card">
          <div class="card-header">
            <h3>DDL语句输入</h3>
            <a-tooltip :title="getDdlInputTooltip">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>

          <!-- CREATE TABLE 输入 -->
          <div v-if="selectedDdlType === 'create'" class="ddl-input-section">
            <div class="form-row">
              <a-input v-model:value="tableName" placeholder="请输入表名" addon-before="表名" />
            </div>

            <div class="form-row">
              <a-textarea
                v-model:value="tableComment"
                placeholder="请输入表注释（可选）"
                :rows="2"
                show-count
              />
            </div>

            <div class="fields-section">
              <div class="section-header">
                <h4>字段定义</h4>
                <a-button type="link" @click="addField" size="small">
                  <template #icon><PlusOutlined /></template>
                  添加字段
                </a-button>
              </div>

              <a-table
                :data-source="fields"
                :columns="fieldColumns"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record, index }">
                  <template v-if="column.key === 'name'">
                    <a-input
                      v-model:value="record.name"
                      placeholder="字段名"
                      @change="updateField(index, 'name', $event)"
                    />
                  </template>

                  <template v-if="column.key === 'type'">
                    <a-select
                      v-model:value="record.type"
                      placeholder="数据类型"
                      style="width: 120px"
                      @change="updateField(index, 'type', $event)"
                    >
                      <a-select-option
                        v-for="type in getDataTypeOptions()"
                        :key="type"
                        :value="type"
                      >
                        {{ type }}
                      </a-select-option>
                    </a-select>
                  </template>

                  <template v-if="column.key === 'length'">
                    <a-input-number
                      v-model:value="record.length"
                      placeholder="长度"
                      :min="1"
                      style="width: 80px"
                      @change="updateField(index, 'length', $event)"
                    />
                  </template>

                  <template v-if="column.key === 'nullable'">
                    <a-checkbox
                      v-model:checked="record.nullable"
                      @change="updateField(index, 'nullable', $event)"
                    >
                      可空
                    </a-checkbox>
                  </template>

                  <template v-if="column.key === 'default'">
                    <a-input
                      v-model:value="record.defaultValue"
                      placeholder="默认值"
                      @change="updateField(index, 'defaultValue', $event)"
                    />
                  </template>

                  <template v-if="column.key === 'comment'">
                    <a-input
                      v-model:value="record.comment"
                      placeholder="字段注释"
                      @change="updateField(index, 'comment', $event)"
                    />
                  </template>

                  <template v-if="column.key === 'actions'">
                    <a-space>
                      <a-button type="link" size="small" @click="removeField(index)" danger>
                        删除
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>

            <div class="constraints-section">
              <div class="section-header">
                <h4>约束定义</h4>
                <a-space>
                  <a-button type="link" @click="addPrimaryKey" size="small"> 主键约束 </a-button>
                  <a-button type="link" @click="addUniqueKey" size="small"> 唯一约束 </a-button>
                </a-space>
              </div>

              <div v-if="constraints.length > 0" class="constraints-list">
                <div
                  v-for="(constraint, index) in constraints"
                  :key="index"
                  class="constraint-item"
                >
                  <span class="constraint-type">{{ constraint.type }}</span>
                  <span class="constraint-fields">{{ constraint.fields.join(', ') }}</span>
                  <a-button type="link" size="small" @click="removeConstraint(index)" danger>
                    删除
                  </a-button>
                </div>
              </div>
              <div v-else class="no-constraints">暂无约束定义</div>
            </div>
          </div>

          <!-- ALTER TABLE 输入 -->
          <div v-else-if="selectedDdlType === 'alter'" class="ddl-input-section">
            <div class="form-row">
              <a-input v-model:value="tableName" placeholder="请输入表名" addon-before="表名" />
            </div>

            <div class="alter-actions">
              <a-radio-group v-model:value="alterAction" button-style="solid">
                <a-radio-button value="add">添加字段</a-radio-button>
                <a-radio-button value="modify">修改字段</a-radio-button>
                <a-radio-button value="drop">删除字段</a-radio-button>
                <a-radio-button value="rename">重命名字段</a-radio-button>
              </a-radio-group>
            </div>

            <!-- 根据选择的alter操作显示不同的输入界面 -->
            <div v-if="alterAction === 'add'" class="alter-add-section">
              <!-- 添加字段的界面 -->
            </div>

            <div v-else-if="alterAction === 'modify'" class="alter-modify-section">
              <!-- 修改字段的界面 -->
            </div>

            <div v-else-if="alterAction === 'drop'" class="alter-drop-section">
              <!-- 删除字段的界面 -->
            </div>

            <div v-else-if="alterAction === 'rename'" class="alter-rename-section">
              <!-- 重命名字段的界面 -->
            </div>
          </div>

          <!-- DROP TABLE 输入 -->
          <div v-else-if="selectedDdlType === 'drop'" class="ddl-input-section">
            <div class="form-row">
              <a-input
                v-model:value="tableName"
                placeholder="请输入要删除的表名"
                addon-before="表名"
              />
            </div>

            <div class="form-row">
              <a-checkbox v-model:checked="dropIfExists"> 如果存在则删除 (IF EXISTS) </a-checkbox>
            </div>
          </div>

          <!-- TRUNCATE TABLE 输入 -->
          <div v-else-if="selectedDdlType === 'truncate'" class="ddl-input-section">
            <div class="form-row">
              <a-input
                v-model:value="tableName"
                placeholder="请输入要清空的表名"
                addon-before="表名"
              />
            </div>
          </div>

          <!-- UPDATE TABLE 输入 -->
          <div v-else-if="selectedDdlType === 'update'" class="ddl-input-section">
            <div class="form-row">
              <a-input v-model:value="tableName" placeholder="请输入表名" addon-before="表名" />
            </div>

            <div class="form-row">
              <a-textarea
                v-model:value="updateWhereClause"
                placeholder="请输入WHERE条件（可选）"
                :rows="3"
                addon-before="WHERE条件"
              />
            </div>

            <div class="fields-section">
              <div class="section-header">
                <h4>更新字段</h4>
                <a-button type="link" @click="addUpdateField" size="small">
                  <template #icon><PlusOutlined /></template>
                  添加字段
                </a-button>
              </div>

              <a-table
                :data-source="updateFields"
                :columns="updateFieldColumns"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record, index }">
                  <template v-if="column.key === 'name'">
                    <a-input
                      v-model:value="record.name"
                      placeholder="字段名"
                      @change="updateUpdateField(index, 'name', $event)"
                    />
                  </template>

                  <template v-if="column.key === 'value'">
                    <a-input
                      v-model:value="record.value"
                      placeholder="更新值"
                      @change="updateUpdateField(index, 'value', $event)"
                    />
                  </template>

                  <template v-if="column.key === 'actions'">
                    <a-button type="link" danger size="small" @click="removeUpdateField(index)">
                      <template #icon><CloseCircleOutlined /></template>
                      删除
                    </a-button>
                  </template>
                </template>
              </a-table>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：输出区域 -->
      <div class="output-section">
        <!-- SQL预览 -->
        <div class="output-card">
          <div class="card-header">
            <h3>生成的DDL语句</h3>
            <div class="output-actions">
              <a-space>
                <a-button type="primary" @click="generateSql" :loading="generating">
                  <template #icon><PlayCircleOutlined /></template>
                  生成SQL
                </a-button>
              </a-space>
            </div>
          </div>

          <SqlPreview
            :sql="generatedSql"
            :stats="sqlStats"
            @copy="copySql"
            @download="downloadSql"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useDdlGenerator } from '../../composables/useDdlGenerator'
import SqlPreview from '../components/SqlPreview/SqlPreview.vue'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'

// 响应式数据
const selectedDatabase = ref('mysql')
const selectedDdlType = ref('create')
const tableName = ref('')
const tableComment = ref('')
const fields = ref([])
const constraints = ref([])
const generatedSql = ref('')
const generating = ref(false)

// UPDATE TABLE 相关数据
const updateWhereClause = ref('')
const updateFields = ref([])

// DDL类型解析器和生成器
const { generateDdl } = useDdlGenerator()

// 数据库选项
const databaseOptions = [
  { value: 'mysql', label: 'MySQL', icon: '🐬', version: '8.0+' },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘', version: '14+' },
  { value: 'oracle', label: 'Oracle', icon: '🏢', version: '19c+' },
  { value: 'sqlserver', label: 'SQL Server', icon: '💼', version: '2019+' },
  { value: 'dm', label: '达梦数据库', icon: '🎯', version: '8.0+' },
]

// 字段表格列定义
const fieldColumns = ref([
  { title: '字段名', key: 'name', width: '15%' },
  { title: '数据类型', key: 'type', width: '15%' },
  { title: '长度', key: 'length', width: '10%' },
  { title: '可空', key: 'nullable', width: '10%' },
  { title: '默认值', key: 'default', width: '15%' },
  { title: '注释', key: 'comment', width: '20%' },
  { title: '操作', key: 'actions', width: '15%' },
])

// UPDATE字段表格列定义
const updateFieldColumns = ref([
  { title: '字段名', key: 'name', width: '40%' },
  { title: '更新值', key: 'value', width: '40%' },
  { title: '操作', key: 'actions', width: '20%' },
])

// 计算属性
const getDdlInputTooltip = computed(() => {
  const tooltips = {
    create: '输入CREATE TABLE语句的表结构和约束信息',
    alter: '输入ALTER TABLE语句的修改操作',
    update: '输入UPDATE TABLE语句的更新字段和WHERE条件',
    drop: '输入要删除的表名',
    truncate: '输入要清空的表名',
  }
  return tooltips[selectedDdlType.value] || '输入DDL语句参数'
})

// SQL统计信息计算属性
const sqlStats = computed(() => ({
  statementCount: generatedSql.value ? 1 : 0,
  affectedRows: 0,
  generationTime: 0,
  fileSize: new Blob([generatedSql.value]).size,
}))

// 方法
const handleDatabaseChange = (value) => {
  selectedDatabase.value = value
  message.info(`已选择数据库: ${getDatabaseInfo(value).name}`)
}

const handleDdlTypeChange = (e) => {
  selectedDdlType.value = e.target.value
  resetDdlInputs()
}

const getDatabaseInfo = (dbType) => {
  const infoMap = {
    mysql: { name: 'MySQL', description: '开源关系型数据库，广泛用于Web应用' },
    postgresql: { name: 'PostgreSQL', description: '功能强大的开源对象关系数据库' },
    oracle: { name: 'Oracle', description: '企业级关系数据库管理系统' },
    sqlserver: { name: 'SQL Server', description: '微软开发的商业关系数据库' },
    sqlite: { name: 'SQLite', description: '轻量级嵌入式数据库引擎' },
  }
  return infoMap[dbType] || { name: '未知数据库', description: '' }
}

const getDataTypeOptions = () => {
  const typeMap = {
    mysql: ['INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'DECIMAL', 'BOOLEAN'],
    postgresql: ['INTEGER', 'VARCHAR', 'TEXT', 'DATE', 'TIMESTAMP', 'NUMERIC', 'BOOLEAN'],
    oracle: ['NUMBER', 'VARCHAR2', 'CLOB', 'DATE', 'TIMESTAMP', 'FLOAT', 'CHAR'],
    sqlserver: ['INT', 'VARCHAR', 'NVARCHAR', 'DATE', 'DATETIME', 'DECIMAL', 'BIT'],
    sqlite: ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC'],
  }
  return typeMap[selectedDatabase.value] || typeMap.mysql
}

const addField = () => {
  fields.value.push({
    name: '',
    type: getDataTypeOptions()[0],
    length: null,
    nullable: true,
    defaultValue: '',
    comment: '',
  })
}

const updateField = (index, field, value) => {
  if (fields.value[index]) {
    fields.value[index][field] = value
  }
}

const removeField = (index) => {
  fields.value.splice(index, 1)
}

const addPrimaryKey = () => {
  if (fields.value.length === 0) {
    message.warning('请先添加字段')
    return
  }

  constraints.value.push({
    type: 'PRIMARY KEY',
    fields: ['id'], // 默认选择第一个字段
  })
}

const addUniqueKey = () => {
  if (fields.value.length === 0) {
    message.warning('请先添加字段')
    return
  }

  constraints.value.push({
    type: 'UNIQUE',
    fields: ['name'], // 默认选择第二个字段
  })
}

const removeConstraint = (index) => {
  constraints.value.splice(index, 1)
}

const resetDdlInputs = () => {
  tableName.value = ''
  tableComment.value = ''
  fields.value = []
  constraints.value = []
  updateWhereClause.value = ''
  updateFields.value = []
}

const addUpdateField = () => {
  updateFields.value.push({
    name: '',
    value: '',
  })
}

const updateUpdateField = (index, field, value) => {
  if (updateFields.value[index]) {
    updateFields.value[index][field] = value
  }
}

const removeUpdateField = (index) => {
  updateFields.value.splice(index, 1)
}

const generateSql = async () => {
  if (!selectedDatabase.value) {
    message.warning('请选择目标数据库')
    return
  }

  if (
    selectedDdlType.value !== 'drop' &&
    selectedDdlType.value !== 'truncate' &&
    !tableName.value.trim()
  ) {
    message.warning('请输入表名')
    return
  }

  if (selectedDdlType.value === 'update' && updateFields.value.length === 0) {
    message.warning('请至少添加一个更新字段')
    return
  }

  generating.value = true

  try {
    // 这里将调用DDL生成器生成SQL
    const sql = await generateDdlSql()
    generatedSql.value = sql
    message.success('DDL语句生成成功')
  } catch (error) {
    message.error('生成DDL语句失败: ' + error.message)
  } finally {
    generating.value = false
  }
}

const generateDdlSql = async () => {
  // 使用DDL生成器生成SQL
  try {
    const options = {
      databaseType: selectedDatabase.value,
      tableName: tableName.value,
      tableComment: tableComment.value,
      fields: fields.value,
      constraints: constraints.value,
    }

    // 根据DDL类型调用相应的生成方法
    const ddlType = selectedDdlType.value.toUpperCase()

    // 特殊处理UPDATE TABLE
    if (ddlType === 'UPDATE') {
      const setClause = updateFields.value
        .map((field) => `${field.name} = ${formatValue(field.value)}`)
        .join(', ')
      const whereClause = updateWhereClause.value ? `WHERE ${updateWhereClause.value}` : ''
      return `UPDATE ${tableName.value} SET ${setClause} ${whereClause};`.trim()
    }

    const sql = await generateDdl(ddlType, options)
    return sql
  } catch (error) {
    console.error('生成DDL语句失败:', error)
    throw new Error(`DDL生成失败: ${error.message}`)
  }
}

const formatValue = (value) => {
  if (!value) return 'NULL'
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`
  }
  if (typeof value === 'number') return value
  return `'${value}'`
}

const copySql = async (sql) => {
  try {
    await navigator.clipboard.writeText(sql || generatedSql.value)
    message.success('SQL已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const downloadSql = (sql) => {
  const sqlToDownload = sql || generatedSql.value
  const blob = new Blob([sqlToDownload], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tableName.value || 'ddl'}_${selectedDdlType.value}.sql`
  a.click()
  URL.revokeObjectURL(url)
  message.success('SQL文件下载成功')
}

const resetAll = () => {
  selectedDatabase.value = 'mysql'
  selectedDdlType.value = 'create'
  resetDdlInputs()
  generatedSql.value = ''
  message.success('所有数据已重置')
}

// 生命周期
onMounted(() => {
  // 初始化一个示例字段
  addField()
})
</script>

<style scoped>
.ddl-page {
  padding: 0;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 10px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 8px;
}

.page-header h2 {
  margin: 0;
  color: #1890ff;
  font-size: 24px;
  font-weight: 600;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: calc(100vh - 120px);
}

.input-section,
.output-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-card,
.output-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.database-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.db-icon {
  font-size: 16px;
}

.db-name {
  font-weight: 500;
}

.db-version {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.database-info {
  margin-top: 12px;
}

.form-row {
  margin-bottom: 12px;
}

.fields-section,
.constraints-section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.constraint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 4px;
}

.constraint-type {
  font-weight: 500;
  color: #1890ff;
}

.no-constraints {
  text-align: center;
  color: #999;
  padding: 20px;
}

.sql-preview {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  max-height: 400px;
  overflow: auto;
}

.sql-code {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.validation-results {
  min-height: 80px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
