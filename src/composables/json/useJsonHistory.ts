/**
 * JSON 历史记录管理 Composable
 * 提供 JSON 历史记录的存储、检索、删除等功能
 * @module composables/json/useJsonHistory
 */

import { ref, computed, watch } from 'vue'
import type { JsonHistoryItem } from '@/types/json'

const STORAGE_KEY = 'json_tool_history'
const MAX_HISTORY_COUNT = 50

/**
 * JSON 历史记录管理 Composable
 * @param maxCount - 最大历史记录数量
 */
export function useJsonHistory(maxCount: number = MAX_HISTORY_COUNT) {
  const history = ref<JsonHistoryItem[]>([])
  const isLoading = ref(false)
  const searchKeyword = ref('')

  const filteredHistory = computed(() => {
    if (!searchKeyword.value.trim()) {
      return history.value
    }

    const keyword = searchKeyword.value.toLowerCase()
    return history.value.filter((item) => {
      const contentMatch = item.content.toLowerCase().includes(keyword)
      const descriptionMatch = item.description?.toLowerCase().includes(keyword)
      return contentMatch || descriptionMatch || false
    })
  })

  const totalCount = computed(() => history.value.length)

  const formatCount = computed(() => history.value.filter((item) => item.type === 'format').length)

  const compareCount = computed(() => history.value.filter((item) => item.type === 'compare').length)

  const loadHistory = () => {
    isLoading.value = true

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        history.value = JSON.parse(stored)
      } else {
        history.value = []
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
      history.value = []
    } finally {
    isLoading.value = false
    }
  }

  const saveHistory = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
    return true
    } catch (error) {
      console.error('保存历史记录失败:', error)
    return false
  }
  }

  const addHistory = (content: string, type: 'format' | 'compare', description?: string): boolean => {
    if (!content.trim()) {
    return false
    }

    const item: JsonHistoryItem = {
      id: generateId(),
      content,
      timestamp: Date.now(),
      type,
      description,
      size: new Blob([content]).size,
    }

    history.value.unshift(item)

    if (history.value.length > maxCount) {
      history.value = history.value.slice(0, maxCount)
    }

    return saveHistory()
  }

  const removeHistory = (id: string): boolean => {
    const index = history.value.findIndex((item) => item.id === id)
    if (index === -1) {
      return false
    }

    history.value.splice(index, 1)
    return saveHistory()
  }

  const clearHistory = (): boolean => {
    history.value = []
    return saveHistory()
  }

  const getHistoryById = (id: string): JsonHistoryItem | undefined => {
    return history.value.find((item) => item.id === id)
  }

  const getRecentHistory = (count: number = 10): JsonHistoryItem[] => {
    return history.value.slice(0, count)
  }

  const getHistoryByType = (type: 'format' | 'compare'): JsonHistoryItem[] => {
    return history.value.filter((item) => item.type === type)
  }

  const getHistoryByDateRange = (startTime: number, endTime: number): JsonHistoryItem[] => {
    return history.value.filter((item) => item.timestamp >= startTime && item.timestamp <= endTime)
  }

  const exportHistory = (): string => {
    return JSON.stringify(history.value, null, 2)
  }

  const importHistory = (jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString)
      if (!Array.isArray(imported)) {
        return false
      }

      const validItems = imported.filter((item) => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.id === 'string' &&
          typeof item.content === 'string' &&
          typeof item.timestamp === 'number' &&
          (item.type === 'format' || item.type === 'compare')
        )
      })

      if (validItems.length === 0) {
        return false
      }

      history.value = validItems.slice(0, maxCount)
      return saveHistory()
    } catch (error) {
      console.error('导入历史记录失败:', error)
      return false
    }
  }

  const setSearchKeyword = (keyword: string) => {
    searchKeyword.value = keyword
  }

  const generateId = (): string => {
    return `json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  loadHistory()

  return {
    history,
    filteredHistory,
    isLoading,
    searchKeyword,
    totalCount,
    formatCount,
    compareCount,
    loadHistory,
    saveHistory,
    addHistory,
    removeHistory,
    clearHistory,
    getHistoryById,
    getRecentHistory,
    getHistoryByType,
    getHistoryByDateRange,
    exportHistory,
    importHistory,
    setSearchKeyword,
  }
}
