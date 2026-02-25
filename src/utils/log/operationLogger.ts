/**
 * 日志工具
 * 提供操作日志的创建、格式化、过滤和导出功能
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  type: string
  context?: Record<string, any>
}

/**
 * 日志筛选选项接口
 */
export interface LogFilterOptions {
  level?: LogLevel | LogLevel[]
  type?: string | string[]
  startTime?: Date
  endTime?: Date
  keyword?: string
}

/**
 * 创建日志ID
 * @returns {string} 唯一的日志ID
 */
export const createLogId = (): string => {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 创建日志条目
 * @param {string} message - 日志消息
 * @param {string} type - 日志类型
 * @param {LogLevel} level - 日志级别
 * @param {Record<string, any>} context - 上下文信息
 * @returns {LogEntry} 日志条目
 */
export const createLogEntry = (
  message: string,
  type: string,
  level: LogLevel = LogLevel.INFO,
  context?: Record<string, any>,
): LogEntry => {
  return {
    id: createLogId(),
    timestamp: new Date(),
    level,
    message,
    type,
    context,
  }
}

/**
 * 格式化日志时间
 * @param {Date} timestamp - 时间戳
 * @param {string} format - 时间格式
 * @returns {string} 格式化后的时间字符串
 */
export const formatLogTime = (
  timestamp: Date,
  format: 'YYYY-MM-DD HH:mm:ss' | 'HH:mm:ss' = 'HH:mm:ss',
): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')

  const year = timestamp.getFullYear()
  const month = pad(timestamp.getMonth() + 1)
  const day = pad(timestamp.getDate())
  const hours = pad(timestamp.getHours())
  const minutes = pad(timestamp.getMinutes())
  const seconds = pad(timestamp.getSeconds())

  if (format === 'YYYY-MM-DD HH:mm:ss') {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return `${hours}:${minutes}:${seconds}`
}

/**
 * 过滤日志条目
 * @param {LogEntry[]} logs - 日志数组
 * @param {LogFilterOptions} options - 筛选选项
 * @returns {LogEntry[]} 过滤后的日志数组
 */
export const filterLogs = (logs: LogEntry[], options: LogFilterOptions): LogEntry[] => {
  return logs.filter((log) => {
    if (options.level) {
      const levels = Array.isArray(options.level) ? options.level : [options.level]
      if (!levels.includes(log.level)) {
        return false
      }
    }

    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type]
      if (!types.includes(log.type)) {
        return false
      }
    }

    if (options.startTime && log.timestamp < options.startTime) {
      return false
    }

    if (options.endTime && log.timestamp > options.endTime) {
      return false
    }

    if (options.keyword) {
      const keyword = options.keyword.toLowerCase()
      const searchableText =
        `${log.message} ${log.type} ${JSON.stringify(log.context || {})}`.toLowerCase()
      if (!searchableText.includes(keyword)) {
        return false
      }
    }

    return true
  })
}

/**
 * 获取日志级别颜色
 * @param {LogLevel} level - 日志级别
 * @returns {string} 颜色值
 */
export const getLogLevelColor = (level: LogLevel): string => {
  const colors: Record<LogLevel, string> = {
    [LogLevel.INFO]: '#1890ff',
    [LogLevel.WARNING]: '#faad14',
    [LogLevel.ERROR]: '#ff4d4f',
    [LogLevel.SUCCESS]: '#52c41a',
  }
  return colors[level] || colors[LogLevel.INFO]
}

/**
 * 获取日志级别文本
 * @param {LogLevel} level - 日志级别
 * @returns {string} 级别文本
 */
export const getLogLevelText = (level: LogLevel): string => {
  const texts: Record<LogLevel, string> = {
    [LogLevel.INFO]: '信息',
    [LogLevel.WARNING]: '警告',
    [LogLevel.ERROR]: '错误',
    [LogLevel.SUCCESS]: '成功',
  }
  return texts[level] || '未知'
}

/**
 * 按类型分组统计日志
 * @param {LogEntry[]} logs - 日志数组
 * @returns {Record<string, number>} 类型统计结果
 */
export const countLogsByType = (logs: LogEntry[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  logs.forEach((log) => {
    counts[log.type] = (counts[log.type] || 0) + 1
  })
  return counts
}

/**
 * 按级别分组统计日志
 * @param {LogEntry[]} logs - 日志数组
 * @returns {Record<LogLevel, number>} 级别统计结果
 */
export const countLogsByLevel = (logs: LogEntry[]): Record<LogLevel, number> => {
  const counts: Record<LogLevel, number> = {
    [LogLevel.INFO]: 0,
    [LogLevel.WARNING]: 0,
    [LogLevel.ERROR]: 0,
    [LogLevel.SUCCESS]: 0,
  }
  logs.forEach((log) => {
    counts[log.level] = (counts[log.level] || 0) + 1
  })
  return counts
}

/**
 * 清空日志
 * @returns {LogEntry[]} 清空后的空日志数组
 */
export const clearLogs = (): LogEntry[] => {
  return []
}

/**
 * 导出日志为JSON格式
 * @param {LogEntry[]} logs - 日志数组
 * @returns {string} JSON字符串
 */
export const exportLogsAsJson = (logs: LogEntry[]): string => {
  return JSON.stringify(logs, null, 2)
}

/**
 * 导出日志为CSV格式
 * @param {LogEntry[]} logs - 日志数组
 * @returns {string} CSV字符串
 */
export const exportLogsAsCsv = (logs: LogEntry[]): string => {
  const headers = ['时间', '级别', '类型', '消息', '上下文']
  const rows = logs.map((log) => [
    formatLogTime(log.timestamp, 'YYYY-MM-DD HH:mm:ss'),
    getLogLevelText(log.level),
    log.type,
    log.message,
    log.context ? JSON.stringify(log.context) : '',
  ])

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
    '\n',
  )
}
