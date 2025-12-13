<template>
  <div class="settings-panel">
    <a-tabs v-model:activeKey="activeTab">
      <!-- 基本设置 -->
      <a-tab-pane key="general" tab="基本设置">
        <div class="settings-section">
          <h3>界面设置</h3>
          <a-form layout="vertical">
            <a-form-item label="主题模式">
              <a-radio-group v-model:value="themeMode">
                <a-radio value="light">浅色模式</a-radio>
                <a-radio value="dark">深色模式</a-radio>
                <a-radio value="auto">跟随系统</a-radio>
              </a-radio-group>
            </a-form-item>
            
            <a-form-item label="语言">
              <a-select v-model:value="language" style="width: 200px">
                <a-select-option value="zh-CN">简体中文</a-select-option>
                <a-select-option value="en-US">English</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="页面布局">
              <a-radio-group v-model:value="layoutMode">
                <a-radio value="fluid">流式布局</a-radio>
                <a-radio value="fixed">固定宽度</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-form>
        </div>
        
        <div class="settings-section">
          <h3>操作设置</h3>
          <a-form layout="vertical">
            <a-form-item label="确认对话框">
              <a-switch 
                v-model:checked="confirmDialogs" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">在执行重要操作前显示确认对话框</div>
            </a-form-item>
            
            <a-form-item label="自动保存">
              <a-switch 
                v-model:checked="autoSave" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">自动保存当前工作状态</div>
            </a-form-item>
            
            <a-form-item label="保存间隔">
              <a-input-number 
                v-model:value="saveInterval" 
                :min="1" 
                :max="60" 
                :disabled="!autoSave"
                addon-after="分钟"
                style="width: 150px"
              />
            </a-form-item>
          </a-form>
        </div>
      </a-tab-pane>

      <!-- SQL设置 -->
      <a-tab-pane key="sql" tab="SQL设置">
        <div class="settings-section">
          <h3>数据库设置</h3>
          <a-form layout="vertical">
            <a-form-item label="默认数据库类型">
              <a-select v-model:value="defaultDatabase" style="width: 200px">
                <a-select-option value="mysql">MySQL</a-select-option>
                <a-select-option value="postgresql">PostgreSQL</a-select-option>
                <a-select-option value="sqlserver">SQL Server</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="SQL格式">
              <a-radio-group v-model:value="sqlFormat">
                <a-radio value="formatted">格式化</a-radio>
                <a-radio value="minified">压缩</a-radio>
              </a-radio-group>
            </a-form-item>
            
            <a-form-item label="批量大小">
              <a-input-number 
                v-model:value="batchSize" 
                :min="1" 
                :max="1000" 
                addon-after="条/批"
                style="width: 150px"
              />
              <div class="setting-description">每批生成的SQL语句数量</div>
            </a-form-item>
            
            <a-form-item label="包含注释">
              <a-switch 
                v-model:checked="includeComments" 
                checked-children="是" 
                un-checked-children="否" 
              />
              <div class="setting-description">在生成的SQL中包含注释信息</div>
            </a-form-item>
          </a-form>
        </div>
        
        <div class="settings-section">
          <h3>字段映射设置</h3>
          <a-form layout="vertical">
            <a-form-item label="默认匹配算法">
              <a-select v-model:value="defaultMatchingAlgorithm" style="width: 200px">
                <a-select-option value="similarity">相似度匹配</a-select-option>
                <a-select-option value="pinyin">拼音匹配</a-select-option>
                <a-select-option value="manual">手动匹配</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="相似度阈值">
              <a-slider 
                v-model:value="similarityThreshold" 
                :min="0" 
                :max="1" 
                :step="0.1"
                :marks="{0: '0', 0.5: '0.5', 1: '1'}"
              />
              <div class="slider-value">当前值: {{ similarityThreshold }}</div>
              <div class="setting-description">字段名称相似度匹配的阈值</div>
            </a-form-item>
            
            <a-form-item label="自动映射">
              <a-switch 
                v-model:checked="autoMapping" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">上传文件后自动执行字段映射</div>
            </a-form-item>
          </a-form>
        </div>
      </a-tab-pane>

      <!-- 文件设置 -->
      <a-tab-pane key="file" tab="文件设置">
        <div class="settings-section">
          <h3>文件上传设置</h3>
          <a-form layout="vertical">
            <a-form-item label="最大文件大小">
              <a-input-number 
                v-model:value="maxFileSize" 
                :min="1" 
                :max="100" 
                addon-after="MB"
                style="width: 150px"
              />
              <div class="setting-description">单个文件的最大上传大小</div>
            </a-form-item>
            
            <a-form-item label="支持的文件格式">
              <a-checkbox-group v-model:value="supportedFormats">
                <a-checkbox value="xlsx">Excel (.xlsx)</a-checkbox>
                <a-checkbox value="xls">Excel (.xls)</a-checkbox>
                <a-checkbox value="csv">CSV (.csv)</a-checkbox>
              </a-checkbox-group>
            </a-form-item>
            
            <a-form-item label="分块处理">
              <a-switch 
                v-model:checked="chunkProcessing" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">对大文件进行分块处理以提高性能</div>
            </a-form-item>
            
            <a-form-item label="分块大小" v-if="chunkProcessing">
              <a-input-number 
                v-model:value="chunkSize" 
                :min="100" 
                :max="10000" 
                addon-after="行"
                style="width: 150px"
              />
            </a-form-item>
          </a-form>
        </div>
        
        <div class="settings-section">
          <h3>导出设置</h3>
          <a-form layout="vertical">
            <a-form-item label="默认导出格式">
              <a-radio-group v-model:value="defaultExportFormat">
                <a-radio value="sql">SQL文件 (.sql)</a-radio>
                <a-radio value="txt">文本文件 (.txt)</a-radio>
                <a-radio value="json">JSON文件 (.json)</a-radio>
              </a-radio-group>
            </a-form-item>
            
            <a-form-item label="文件编码">
              <a-select v-model:value="fileEncoding" style="width: 200px">
                <a-select-option value="utf-8">UTF-8</a-select-option>
                <a-select-option value="gbk">GBK</a-select-option>
                <a-select-option value="gb2312">GB2312</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="自动下载">
              <a-switch 
                v-model:checked="autoDownload" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">生成完成后自动下载文件</div>
            </a-form-item>
          </a-form>
        </div>
      </a-tab-pane>

      <!-- 高级设置 -->
      <a-tab-pane key="advanced" tab="高级设置">
        <div class="settings-section">
          <h3>性能设置</h3>
          <a-form layout="vertical">
            <a-form-item label="缓存大小">
              <a-input-number 
                v-model:value="cacheSize" 
                :min="10" 
                :max="1000" 
                addon-after="MB"
                style="width: 150px"
              />
              <div class="setting-description">内存缓存的最大大小</div>
            </a-form-item>
            
            <a-form-item label="并行处理">
              <a-switch 
                v-model:checked="parallelProcessing" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">启用多线程并行处理</div>
            </a-form-item>
            
            <a-form-item label="日志级别">
              <a-select v-model:value="logLevel" style="width: 200px">
                <a-select-option value="error">错误</a-select-option>
                <a-select-option value="warn">警告</a-select-option>
                <a-select-option value="info">信息</a-select-option>
                <a-select-option value="debug">调试</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </div>
        
        <div class="settings-section">
          <h3>调试设置</h3>
          <a-form layout="vertical">
            <a-form-item label="开发者模式">
              <a-switch 
                v-model:checked="developerMode" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">显示调试信息和高级选项</div>
            </a-form-item>
            
            <a-form-item label="控制台日志">
              <a-switch 
                v-model:checked="consoleLogging" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">在浏览器控制台输出详细日志</div>
            </a-form-item>
            
            <a-form-item label="性能监控">
              <a-switch 
                v-model:checked="performanceMonitoring" 
                checked-children="开启" 
                un-checked-children="关闭" 
              />
              <div class="setting-description">监控系统性能并生成报告</div>
            </a-form-item>
          </a-form>
        </div>
      </a-tab-pane>
    </a-tabs>
    
    <div class="settings-actions">
      <a-button @click="handleReset">恢复默认</a-button>
      <a-button type="primary" @click="handleSave">保存设置</a-button>
      <a-button @click="$emit('close')">取消</a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'

// 定义事件
const emit = defineEmits(['close'])

// 响应式数据
const activeTab = ref('general')

// 基本设置
const themeMode = ref('light')
const language = ref('zh-CN')
const layoutMode = ref('fluid')
const confirmDialogs = ref(true)
const autoSave = ref(true)
const saveInterval = ref(5)

// SQL设置
const defaultDatabase = ref('mysql')
const sqlFormat = ref('formatted')
const batchSize = ref(100)
const includeComments = ref(true)
const defaultMatchingAlgorithm = ref('similarity')
const similarityThreshold = ref(0.3)
const autoMapping = ref(true)

// 文件设置
const maxFileSize = ref(10)
const supportedFormats = ref(['xlsx', 'xls', 'csv'])
const chunkProcessing = ref(true)
const chunkSize = ref(1000)
const defaultExportFormat = ref('sql')
const fileEncoding = ref('utf-8')
const autoDownload = ref(false)

// 高级设置
const cacheSize = ref(100)
const parallelProcessing = ref(false)
const logLevel = ref('info')
const developerMode = ref(false)
const consoleLogging = ref(false)
const performanceMonitoring = ref(false)

// 方法
const loadSettings = () => {
  // 从localStorage加载设置
  const savedSettings = localStorage.getItem('sqlToolSettings')
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      Object.keys(settings).forEach(key => {
        if (refs[key] !== undefined) {
          refs[key].value = settings[key]
        }
      })
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
}

const saveSettings = () => {
  const settings = {
    themeMode: themeMode.value,
    language: language.value,
    layoutMode: layoutMode.value,
    confirmDialogs: confirmDialogs.value,
    autoSave: autoSave.value,
    saveInterval: saveInterval.value,
    defaultDatabase: defaultDatabase.value,
    sqlFormat: sqlFormat.value,
    batchSize: batchSize.value,
    includeComments: includeComments.value,
    defaultMatchingAlgorithm: defaultMatchingAlgorithm.value,
    similarityThreshold: similarityThreshold.value,
    autoMapping: autoMapping.value,
    maxFileSize: maxFileSize.value,
    supportedFormats: supportedFormats.value,
    chunkProcessing: chunkProcessing.value,
    chunkSize: chunkSize.value,
    defaultExportFormat: defaultExportFormat.value,
    fileEncoding: fileEncoding.value,
    autoDownload: autoDownload.value,
    cacheSize: cacheSize.value,
    parallelProcessing: parallelProcessing.value,
    logLevel: logLevel.value,
    developerMode: developerMode.value,
    consoleLogging: consoleLogging.value,
    performanceMonitoring: performanceMonitoring.value
  }

  try {
    localStorage.setItem('sqlToolSettings', JSON.stringify(settings))
    message.success('设置保存成功')
    emit('close')
  } catch (error) {
    message.error('设置保存失败')
    console.error('保存设置失败:', error)
  }
}

const resetSettings = () => {
  // 重置为默认值
  themeMode.value = 'light'
  language.value = 'zh-CN'
  layoutMode.value = 'fluid'
  confirmDialogs.value = true
  autoSave.value = true
  saveInterval.value = 5
  defaultDatabase.value = 'mysql'
  sqlFormat.value = 'formatted'
  batchSize.value = 100
  includeComments.value = true
  defaultMatchingAlgorithm.value = 'similarity'
  similarityThreshold.value = 0.3
  autoMapping.value = true
  maxFileSize.value = 10
  supportedFormats.value = ['xlsx', 'xls', 'csv']
  chunkProcessing.value = true
  chunkSize.value = 1000
  defaultExportFormat.value = 'sql'
  fileEncoding.value = 'utf-8'
  autoDownload.value = false
  cacheSize.value = 100
  parallelProcessing.value = false
  logLevel.value = 'info'
  developerMode.value = false
  consoleLogging.value = false
  performanceMonitoring.value = false

  message.success('设置已恢复为默认值')
}

const handleSave = () => {
  saveSettings()
}

const handleReset = () => {
  resetSettings()
}

// 引用所有响应式变量，用于批量操作
const refs = {
  themeMode, language, layoutMode, confirmDialogs, autoSave, saveInterval,
  defaultDatabase, sqlFormat, batchSize, includeComments, defaultMatchingAlgorithm,
  similarityThreshold, autoMapping, maxFileSize, supportedFormats, chunkProcessing,
  chunkSize, defaultExportFormat, fileEncoding, autoDownload, cacheSize,
  parallelProcessing, logLevel, developerMode, consoleLogging, performanceMonitoring
}

// 生命周期
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-panel {
  max-height: 70vh;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.settings-section h3 {
  margin-bottom: 16px;
  color: #1890ff;
  font-size: 16px;
  font-weight: 600;
}

.setting-description {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}

.slider-value {
  text-align: center;
  margin-top: 8px;
  font-weight: 500;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-panel {
    max-height: 60vh;
  }
  
  .settings-actions {
    flex-direction: column;
  }
  
  .settings-actions .ant-btn {
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>