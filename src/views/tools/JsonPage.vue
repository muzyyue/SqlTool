<script setup>
/**
 * JsonPage - JSON 工具箱
 * 采用左右分栏布局：左侧代码编辑器，右侧树形视图
 *
 * @module JsonPage
 */
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import {
  PlayCircleOutlined,
  CopyOutlined,
  CompressOutlined,
  CodeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  MinusOutlined,
  ExperimentOutlined,
  SwapOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import JsonTreeView from '@/components/json/JsonTreeView.vue'
import { useThemeStore } from '@/stores/theme.js'
import { chineseToUnicode, unicodeToChinese } from '@/utils/json/unicode.js'

// ========================================
// 状态
// ========================================
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// ========================================
// 输入状态
// ========================================
const inputJson = ref('')
const outputJson = ref('')
const jsonStats = ref(null)

// ========================================
// 选项状态
// ========================================
const handleChineseComma = ref(true)
const enableFold = ref(true)

// ========================================
// 计算属性
// ========================================

/**
 * 解析后的 JSON 对象
 */
const parsedJson = computed(() => {
  if (!inputJson.value.trim()) return null
  
  try {
    let jsonText = inputJson.value
    if (handleChineseComma.value) {
      jsonText = jsonText.replace(/，/g, ',')
    }
    return JSON.parse(jsonText)
  } catch {
    return null
  }
})

// ========================================
// 方法
// ========================================

/**
 * 格式化 JSON
 */
const handleFormat = async () => {
  if (!inputJson.value.trim()) {
    message.warning('请输入 JSON 数据')
    return
  }

  try {
    let jsonText = inputJson.value

    if (handleChineseComma.value) {
      jsonText = jsonText.replace(/，/g, ',')
    }

    const parsed = JSON.parse(jsonText)
    outputJson.value = JSON.stringify(parsed, null, 2)
    jsonStats.value = calculateJsonStats(parsed)
    message.success('格式化成功')
  } catch (error) {
    message.error('JSON 格式错误：' + error.message)
  }
}

/**
 * 压缩 JSON
 */
const handleCompress = async () => {
  if (!inputJson.value.trim()) {
    message.warning('请输入 JSON 数据')
    return
  }

  try {
    let jsonText = inputJson.value

    if (handleChineseComma.value) {
      jsonText = jsonText.replace(/，/g, ',')
    }

    const parsed = JSON.parse(jsonText)
    outputJson.value = JSON.stringify(parsed)
    jsonStats.value = calculateJsonStats(parsed)
    message.success('压缩成功')
  } catch (error) {
    message.error('JSON 格式错误：' + error.message)
  }
}

/**
 * 处理转义菜单点击
 */
const handleEscapeMenuClick = async ({ key }) => {
  if (!inputJson.value.trim()) {
    message.warning('请输入 JSON 数据')
    return
  }

  try {
    if (key === 'escape') {
      outputJson.value = JSON.stringify(inputJson.value)
      message.success('转义成功')
    } else if (key === 'unescape') {
      try {
        outputJson.value = JSON.parse(inputJson.value)
        message.success('反转义成功')
      } catch {
        outputJson.value = inputJson.value
        message.success('无需反转义')
      }
    }
    jsonStats.value = calculateJsonStats(JSON.parse(outputJson.value))
  } catch (error) {
    message.error('操作失败：' + error.message)
  }
}

/**
 * 处理 Unicode 菜单点击
 */
const handleUnicodeMenuClick = async ({ key }) => {
  if (!inputJson.value.trim()) {
    message.warning('请输入数据')
    return
  }

  try {
    if (key === 'toUnicode') {
      const result = chineseToUnicode(inputJson.value)
      if (result.success) {
        outputJson.value = result.data
        message.success('转换成功')
      } else {
        message.error(result.error || '转换失败')
      }
    } else if (key === 'toChinese') {
      const result = unicodeToChinese(inputJson.value)
      if (result.success) {
        outputJson.value = result.data
        message.success('转换成功')
      } else {
        message.error(result.error || '转换失败')
      }
    }
  } catch (error) {
    message.error('转换失败：' + error.message)
  }
}

/**
 * 清空编辑器
 */
const handleClear = () => {
  inputJson.value = ''
  outputJson.value = ''
  jsonStats.value = null
  message.success('已清空')
}

/**
 * 加载示例数据
 */
const handleSample = () => {
  inputJson.value = JSON.stringify(
    {
      bigId: 12345678912345678,
      id2: 54321,
      username: 'BeJson',
      email: 'developer@bejson.com',
      isActive: true,
    },
    null,
    2,
  )
  message.success('已加载示例数据')
}

/**
 * 添加转义
 */
const handleAddDefinition = () => {
  message.info('添加转义功能')
}

/**
 * 去除转义
 */
const handleRemoveDefinition = () => {
  message.info('去除转义功能')
}

/**
 * 转 Get 参数
 */
const handleGetParams = () => {
  try {
    const parsed = JSON.parse(inputJson.value)
    const params = new URLSearchParams(parsed).toString()
    outputJson.value = params
    message.success('转换成功')
  } catch (error) {
    message.error('转换失败：' + error.message)
  }
}

/**
 * Dict 转 Json
 */
const handleDictToJson = () => {
  message.info('Dict 转 Json 功能')
}

/**
 * Json 转 Dict
 */
const handleJsonToDict = () => {
  message.info('Json 转 Dict 功能')
}

/**
 * 全折叠
 */
const handleFoldAll = () => {
  message.info('折叠功能')
}

/**
 * 树形视图格式化
 */
const handleTreeFormat = () => {
  handleFormat()
}

/**
 * 代码转换
 */
const handleCodeConvert = () => {
  message.info('代码转换功能')
}

/**
 * 全展开
 */
const handleExpandAll = () => {
  message.info('展开所有节点')
}

/**
 * 全折叠（树形视图）
 */
const handleFoldAllTree = () => {
  message.info('折叠所有节点')
}

/**
 * 计算 JSON 统计信息
 */
const calculateJsonStats = (data) => {
  let objectCount = 0
  let arrayCount = 0
  let fieldCount = 0

  const traverse = (obj) => {
    if (Array.isArray(obj)) {
      arrayCount++
      obj.forEach((item) => traverse(item))
    } else if (typeof obj === 'object' && obj !== null) {
      objectCount++
      Object.keys(obj).forEach((key) => {
        fieldCount++
        traverse(obj[key])
      })
    }
  }

  traverse(data)

  return {
    objectCount,
    arrayCount,
    fieldCount,
    size: new Blob([JSON.stringify(data)]).size,
  }
}

/**
 * 格式化文件大小
 */
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 处理树节点点击
 */
const handleNodeClick = (path, value) => {
  console.log('Node clicked:', path, value)
}

/**
 * 复制输出
 */
const copyOutput = async () => {
  const content = outputJson.value || inputJson.value
  if (!content) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

// ========================================
// 生命周期
// ========================================

onMounted(() => {
  // 设置默认示例数据
  handleSample()
})
</script>

<style scoped lang="scss">
/**
 * JSON 工具页面样式
 * 左右分栏布局：左侧代码编辑器，右侧树形视图
 */

.json-page {
  min-height: 100vh;
  background: var(--bg-base);
  padding: 20px;
}

// 页面头部
.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

// 主容器：左右分栏
.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: calc(100vh - 200px);
}

// 左侧面板
.left-panel {
  display: flex;
  flex-direction: column;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

// 顶部工具栏
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-sunken);
  border-bottom: 1px solid var(--border-default);
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

// 代码编辑器包装器
.code-editor-wrapper {
  flex: 1;
  min-height: 400px;
}

// 底部工具栏
.bottom-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-sunken);
  border-top: 1px solid var(--border-default);
}

.bottom-left,
.bottom-center,
.bottom-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

// 右侧面板
.right-panel {
  display: flex;
  flex-direction: column;
}

.tree-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

// 树形视图工具栏
.tree-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-sunken);
  border-bottom: 1px solid var(--border-default);
}

.tree-toolbar-left,
.tree-toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

// 树形视图区域
.tree-view-wrapper {
  flex: 1;
  min-height: 400px;
  padding: 16px;
  overflow: auto;
}

// 底部信息栏
.info-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-sunken);
  border-top: 1px solid var(--border-default);
  font-size: 13px;
  color: var(--text-secondary);
}

// 空占位符
.empty-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

// 底部标语
.footer-slogan {
  text-align: center;
  padding: 32px 16px;
  margin-top: 24px;
}

.slogan-text {
  p {
    margin: 8px 0;
    font-size: 16px;
    color: var(--text-secondary);
    font-weight: 500;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .main-container {
    grid-template-columns: 1fr;
  }

  .left-panel,
  .right-panel {
    height: auto;
  }

  .code-editor-wrapper,
  .tree-view-wrapper {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .json-page {
    padding: 16px;
  }

  .page-title {
    font-size: 28px;
  }

  .toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }

  .bottom-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .bottom-left,
  .bottom-center,
  .bottom-right {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
