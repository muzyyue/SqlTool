/**
 * JSON 工具 Composable
 * 提供 JSON 工具的状态管理和操作方法
 * @module composables/json/useJsonTools
 */

import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  formatJson,
  minifyJson,
  escapeJson,
  unescapeJson,
  validateJson,
  calculateJsonStats,
  handleChineseComma,
  handleChineseQuote,
  encodeUnicode,
  decodeUnicode,
} from '@/utils/json'
import type { JsonStats, JsonValidationResult } from '@/types/json'

/**
 * JSON 工具配置
 */
export interface JsonToolConfig {
  /** 默认缩进空格数 */
  defaultIndentSpaces?: number
  /** 默认字体大小 */
  defaultFontSize?: number
  /** 是否自动处理中文逗号 */
  autoHandleChineseComma?: boolean
  /** 是否实时验证 */
  enableRealtimeValidation?: boolean
  /** 历史记录最大数量 */
  maxHistoryCount?: number
}

/**
 * JSON 工具 Composable
 * @param config - 配置选项
 */
export function useJsonTools(config: JsonToolConfig = {}) {
  const {
    defaultIndentSpaces = 2,
    defaultFontSize = 14,
    autoHandleChineseComma = true,
    enableRealtimeValidation = true,
    maxHistoryCount = 50,
  } = config

  const inputJson = ref('')
  const outputJson = ref('')
  const indentSpaces = ref(defaultIndentSpaces)
  const fontSize = ref(defaultFontSize)
  const viewMode = ref<'tree' | 'code'>('code')
  const isValid = ref(false)
  const validationResult = ref<JsonValidationResult | null>(null)
  const stats = ref<JsonStats | null>(null)
  const isProcessing = ref(false)

  const formattedJson = computed(() => {
    if (!outputJson.value) return ''
    return outputJson.value
  })

  const minifiedJson = computed(() => {
    if (!inputJson.value) return ''
    try {
      return minifyJson(inputJson.value)
    } catch {
      return ''
    }
  })

  const handleFormat = async () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    isProcessing.value = true

    try {
      let jsonText = inputJson.value

      if (autoHandleChineseComma) {
        jsonText = handleChineseComma(jsonText)
        jsonText = handleChineseQuote(jsonText)
      }

      const parsed = JSON.parse(jsonText)
      outputJson.value = JSON.stringify(parsed, null, indentSpaces.value)
      stats.value = calculateJsonStats(parsed)
      isValid.value = true
      validationResult.value = { isValid: true }
      message.success('格式化成功')
    } catch (error) {
      isValid.value = false
      validationResult.value = {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
      message.error('JSON 格式错误: ' + validationResult.value.errorMessage)
    } finally {
      isProcessing.value = false
    }
  }

  const handleMinify = () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    try {
      const result = minifyJson(inputJson.value)
      outputJson.value = result
      message.success('压缩成功')
    } catch (error) {
      message.error('压缩失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEscape = () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    try {
      const result = escapeJson(inputJson.value)
      outputJson.value = result
      message.success('转义成功')
    } catch (error) {
      message.error('转义失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleUnescape = () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    try {
      const result = unescapeJson(inputJson.value)
      outputJson.value = result
      message.success('反转义成功')
    } catch (error) {
      message.error('反转义失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEncodeUnicode = () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    try {
      const result = encodeUnicode(inputJson.value)
      outputJson.value = result
      message.success('Unicode 编码成功')
    } catch (error) {
      message.error('编码失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDecodeUnicode = () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    try {
      const result = decodeUnicode(inputJson.value)
      outputJson.value = result
      message.success('Unicode 解码成功')
    } catch (error) {
      message.error('解码失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleValidate = () => {
    if (!inputJson.value.trim()) {
      message.warning('请输入 JSON 数据')
      return
    }

    const result = validateJson(inputJson.value)
    validationResult.value = result

    if (result.isValid) {
      message.success('JSON 格式正确')
    } else {
      message.error('JSON 格式错误: ' + result.errorMessage)
    }
  }

  const handleClear = () => {
    inputJson.value = ''
    outputJson.value = ''
    stats.value = null
    validationResult.value = null
    isValid.value = false
    message.success('已清空')
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        inputJson.value = text
        message.success('已粘贴')
      }
    } catch {
      message.error('粘贴失败，请检查浏览器权限')
    }
  }

  const handleCopy = async () => {
    if (!outputJson.value) {
      message.warning('没有内容可复制')
      return
    }

    try {
      await navigator.clipboard.writeText(outputJson.value)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败，请检查浏览器权限')
    }
  }

  const handleDownload = () => {
    if (!outputJson.value) {
      message.warning('没有内容可下载')
      return
    }

    const blob = new Blob([outputJson.value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formatted.json'
    a.click()
    URL.revokeObjectURL(url)
    message.success('下载成功')
  }

  const setInputJson = (value: string) => {
    inputJson.value = value
  }

  const setOutputJson = (value: string) => {
    outputJson.value = value
  }

  const setIndentSpaces = (value: number) => {
    indentSpaces.value = value
  }

  const setFontSize = (value: number) => {
    fontSize.value = value
  }

  const setViewMode = (value: 'tree' | 'code') => {
    viewMode.value = value
  }

  return {
    inputJson,
    outputJson,
    indentSpaces,
    fontSize,
    viewMode,
    isValid,
    validationResult,
    stats,
    isProcessing,
    formattedJson,
    minifiedJson,
    handleFormat,
    handleMinify,
    handleEscape,
    handleUnescape,
    handleEncodeUnicode,
    handleDecodeUnicode,
    handleValidate,
    handleClear,
    handlePaste,
    handleCopy,
    handleDownload,
    setInputJson,
    setOutputJson,
    setIndentSpaces,
    setFontSize,
    setViewMode,
  }
}
