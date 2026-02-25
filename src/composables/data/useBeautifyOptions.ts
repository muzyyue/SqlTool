/**
 * SQL 美化选项 Composable
 * 提供 SQL 格式化选项配置功能
 */

import { ref } from 'vue'
import { message } from 'ant-design-vue'

/**
 * 美化选项接口
 */
export interface BeautifyOptions {
  indentSpaces: number
  formatStyle: 'compact' | 'expanded'
  keywordCase: 'upper' | 'preserve'
  maxLineLength: number
  alignValues: boolean
}

/**
 * 默认美化选项
 */
const DEFAULT_OPTIONS: BeautifyOptions = {
  indentSpaces: 4,
  formatStyle: 'expanded',
  keywordCase: 'upper',
  maxLineLength: 80,
  alignValues: true,
}

/**
 * 获取美化选项变更详情
 * @param {BeautifyOptions} previous - 之前的选项
 * @param {BeautifyOptions} current - 当前的选项
 * @returns {string[]} 变更描述列表
 */
export const getOptionChanges = (
  previous: BeautifyOptions,
  current: BeautifyOptions,
): string[] => {
  const changes: string[] = []

  if (previous.indentSpaces !== current.indentSpaces) {
    changes.push(`缩进空格数: ${previous.indentSpaces} → ${current.indentSpaces}`)
  }

  if (previous.formatStyle !== current.formatStyle) {
    changes.push(`格式化风格: ${previous.formatStyle} → ${current.formatStyle}`)
  }

  if (previous.keywordCase !== current.keywordCase) {
    changes.push(`关键字大小写: ${previous.keywordCase} → ${current.keywordCase}`)
  }

  if (previous.maxLineLength !== current.maxLineLength) {
    changes.push(`最大行长度: ${previous.maxLineLength} → ${current.maxLineLength}`)
  }

  if (previous.alignValues !== current.alignValues) {
    changes.push(
      `垂直对齐: ${previous.alignValues ? '开启' : '关闭'} → ${current.alignValues ? '开启' : '关闭'}`,
    )
  }

  return changes.length > 0 ? changes : ['无变更']
}

/**
 * SQL 美化选项 Composable
 * @returns {Object} 美化选项相关的状态和方法
 */
export function useBeautifyOptions() {
  const showBeautifyOptions = ref(false)
  const beautifyOptions = ref<BeautifyOptions>({ ...DEFAULT_OPTIONS })

  /**
   * 切换美化选项面板显示状态
   * @param {Function} logInfo - 日志记录函数
   */
  const toggleBeautifyOptions = (
    logInfo: (message: string, type: string, context?: any) => void,
  ) => {
    const newState = !showBeautifyOptions.value
    showBeautifyOptions.value = newState

    logInfo(`SQL美化选项面板${newState ? '显示' : '隐藏'}`, 'beautify', {
      operation: 'toggleBeautifyOptions',
      operationType: 'beautify',
      isVisible: newState,
    })
  }

  /**
   * 应用美化选项
   * @param {Function} logInfo - 日志记录函数
   * @param {Function} setBeautifyOptions - 设置美化选项的函数
   * @param {Function} regenerateSql - 重新生成 SQL 的函数（可选）
   */
  const applyBeautifyOptions = (
    logInfo: (message: string, type: string, context?: any) => void,
    setBeautifyOptions: (options: BeautifyOptions) => void,
    regenerateSql?: () => void,
  ) => {
    try {
      const previousOptions = { ...beautifyOptions.value }

      setBeautifyOptions(beautifyOptions.value)

      if (regenerateSql) {
        regenerateSql()
      }

      const optionChanges = getOptionChanges(previousOptions, beautifyOptions.value)
      logInfo('SQL美化选项已应用', 'beautify', {
        operation: 'applyBeautifyOptions',
        operationType: 'beautify',
        options: beautifyOptions.value,
        changes: optionChanges,
      })
      message.success('美化选项已应用')
    } catch (error) {
      logInfo(`应用美化选项失败: ${(error as Error).message}`, 'beautify', {
        operation: 'applyBeautifyOptions',
        operationType: 'beautify',
        options: beautifyOptions.value,
        error: (error as Error).message,
      })
      message.error('应用美化选项失败')
    }
  }

  /**
   * 重置美化选项为默认值
   * @param {Function} logInfo - 日志记录函数
   * @param {Function} resetDefaultBeautifyOptions - 重置默认美化选项的函数
   */
  const resetBeautifyOptions = (
    logInfo: (message: string, type: string, context?: any) => void,
    resetDefaultBeautifyOptions: () => void,
  ) => {
    const previousOptions = { ...beautifyOptions.value }

    beautifyOptions.value = { ...DEFAULT_OPTIONS }
    resetDefaultBeautifyOptions()

    const optionChanges = getOptionChanges(previousOptions, beautifyOptions.value)
    logInfo('SQL美化选项已重置为默认值', 'beautify', {
      operation: 'resetBeautifyOptions',
      operationType: 'beautify',
      previousOptions: previousOptions,
      newOptions: beautifyOptions.value,
      changes: optionChanges,
    })
    message.info('美化选项已重置')
  }

  /**
   * 更新单个美化选项
   * @param {keyof BeautifyOptions} key - 选项键
   * @param {any} value - 选项值
   */
  const updateOption = <K extends keyof BeautifyOptions>(key: K, value: BeautifyOptions[K]) => {
    beautifyOptions.value[key] = value
  }

  /**
   * 批量更新美化选项
   * @param {Partial<BeautifyOptions>} options - 要更新的选项
   */
  const updateOptions = (options: Partial<BeautifyOptions>) => {
    beautifyOptions.value = { ...beautifyOptions.value, ...options }
  }

  return {
    showBeautifyOptions,
    beautifyOptions,
    toggleBeautifyOptions,
    applyBeautifyOptions,
    resetBeautifyOptions,
    updateOption,
    updateOptions,
    getOptionChanges,
  }
}
