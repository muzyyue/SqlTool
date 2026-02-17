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
                <a-select-option value="en-US">英语</a-select-option>
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
                :marks="{ 0: '0', 0.5: '0.5', 1: '1' }"
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
import { ref, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme.js'
import { useSettings } from '@/composables/core/useSettings.js'

const emit = defineEmits(['close'])

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const { settings, updateSettings, resetSettings: resetAllSettings, defaultSettings } = useSettings()

const activeTab = ref('general')

const themeMode = ref(settings.value.themeMode)
const language = ref(settings.value.language)
const layoutMode = ref(settings.value.layoutMode)
const confirmDialogs = ref(settings.value.confirmDialogs)
const autoSave = ref(settings.value.autoSave)
const saveInterval = ref(settings.value.saveInterval)

watch(themeMode, (newMode) => {
  themeStore.setTheme(newMode)
})

watch(isDark, (newIsDark) => {
  themeMode.value = newIsDark ? 'dark' : 'light'
})

const defaultDatabase = ref(settings.value.defaultDatabase)
const sqlFormat = ref(settings.value.sqlFormat)
const batchSize = ref(settings.value.batchSize)
const includeComments = ref(settings.value.includeComments)
const defaultMatchingAlgorithm = ref(settings.value.defaultMatchingAlgorithm)
const similarityThreshold = ref(settings.value.similarityThreshold)
const autoMapping = ref(settings.value.autoMapping)

const maxFileSize = ref(settings.value.maxFileSize)
const supportedFormats = ref([...settings.value.supportedFormats])
const chunkProcessing = ref(settings.value.chunkProcessing)
const chunkSize = ref(settings.value.chunkSize)
const defaultExportFormat = ref(settings.value.defaultExportFormat)
const fileEncoding = ref(settings.value.fileEncoding)
const autoDownload = ref(settings.value.autoDownload)

const cacheSize = ref(settings.value.cacheSize)
const parallelProcessing = ref(settings.value.parallelProcessing)
const logLevel = ref(settings.value.logLevel)
const developerMode = ref(settings.value.developerMode)
const consoleLogging = ref(settings.value.consoleLogging)
const performanceMonitoring = ref(settings.value.performanceMonitoring)

const handleSave = () => {
  const newSettings = {
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
    performanceMonitoring: performanceMonitoring.value,
  }

  updateSettings(newSettings)
  message.success('设置保存成功')
  emit('close')
}

const handleReset = () => {
  resetAllSettings()
  themeMode.value = defaultSettings.themeMode
  language.value = defaultSettings.language
  layoutMode.value = defaultSettings.layoutMode
  confirmDialogs.value = defaultSettings.confirmDialogs
  autoSave.value = defaultSettings.autoSave
  saveInterval.value = defaultSettings.saveInterval
  defaultDatabase.value = defaultSettings.defaultDatabase
  sqlFormat.value = defaultSettings.sqlFormat
  batchSize.value = defaultSettings.batchSize
  includeComments.value = defaultSettings.includeComments
  defaultMatchingAlgorithm.value = defaultSettings.defaultMatchingAlgorithm
  similarityThreshold.value = defaultSettings.similarityThreshold
  autoMapping.value = defaultSettings.autoMapping
  maxFileSize.value = defaultSettings.maxFileSize
  supportedFormats.value = [...defaultSettings.supportedFormats]
  chunkProcessing.value = defaultSettings.chunkProcessing
  chunkSize.value = defaultSettings.chunkSize
  defaultExportFormat.value = defaultSettings.defaultExportFormat
  fileEncoding.value = defaultSettings.fileEncoding
  autoDownload.value = defaultSettings.autoDownload
  cacheSize.value = defaultSettings.cacheSize
  parallelProcessing.value = defaultSettings.parallelProcessing
  logLevel.value = defaultSettings.logLevel
  developerMode.value = defaultSettings.developerMode
  consoleLogging.value = defaultSettings.consoleLogging
  performanceMonitoring.value = defaultSettings.performanceMonitoring
  themeStore.setTheme('light')
  message.success('设置已恢复为默认值')
}

onMounted(() => {
  themeMode.value = isDark.value ? 'dark' : 'light'
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
