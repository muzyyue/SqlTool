import { ref, computed } from 'vue'

/**
 * 错误处理与日志系统
 * 提供全面的错误处理、日志记录和用户提示功能
 */
export function useErrorHandler() {
  const errorLogs = ref([])
  const warningLogs = ref([])
  const infoLogs = ref([])
  const maxLogSize = ref(1000) // 最大日志条数

  /**
   * 错误类型定义
   */
  const ErrorTypes = {
    VALIDATION: 'validation',
    PARSING: 'parsing',
    GENERATION: 'generation',
    NETWORK: 'network',
    FILE: 'file',
    UNKNOWN: 'unknown'
  }

  /**
   * 错误级别定义
   */
  const ErrorLevels = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }

  /**
   * 记录错误
   */
  const logError = (error, type = ErrorTypes.UNKNOWN, context = {}) => {
    const errorEntry = createLogEntry(error, ErrorLevels.ERROR, type, context)
    errorLogs.value.unshift(errorEntry)
    
    // 限制日志大小
    if (errorLogs.value.length > maxLogSize.value) {
      errorLogs.value = errorLogs.value.slice(0, maxLogSize.value)
    }

    console.error('系统错误:', errorEntry)
    return errorEntry
  }

  /**
   * 记录警告
   */
  const logWarning = (warning, type = ErrorTypes.UNKNOWN, context = {}) => {
    const warningEntry = createLogEntry(warning, ErrorLevels.WARNING, type, context)
    warningLogs.value.unshift(warningEntry)
    
    if (warningLogs.value.length > maxLogSize.value) {
      warningLogs.value = warningLogs.value.slice(0, maxLogSize.value)
    }

    console.warn('系统警告:', warningEntry)
    return warningEntry
  }

  /**
   * 记录信息
   */
  const logInfo = (info, type = ErrorTypes.UNKNOWN, context = {}) => {
    const infoEntry = createLogEntry(info, ErrorLevels.INFO, type, context)
    infoLogs.value.unshift(infoEntry)
    
    if (infoLogs.value.length > maxLogSize.value) {
      infoLogs.value = infoLogs.value.slice(0, maxLogSize.value)
    }

    console.info('系统信息:', infoEntry)
    return infoEntry
  }

  /**
   * 创建日志条目
   */
  const createLogEntry = (message, level, type, context = {}) => {
    const timestamp = new Date().toISOString()
    const id = generateId()
    
    return {
      id,
      timestamp,
      level,
      type,
      message: typeof message === 'string' ? message : message?.message || '未知错误',
      stack: message?.stack,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        ...context
      },
      resolved: false
    }
  }

  /**
   * 生成唯一ID
   */
  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 处理验证错误
   */
  const handleValidationError = (errors, context = {}) => {
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        logError(error, ErrorTypes.VALIDATION, context)
      })
    } else {
      logError(errors, ErrorTypes.VALIDATION, context)
    }
    
    return getFriendlyErrorMessage(ErrorTypes.VALIDATION, errors)
  }

  /**
   * 处理解析错误
   */
  const handleParsingError = (error, context = {}) => {
    logError(error, ErrorTypes.PARSING, context)
    return getFriendlyErrorMessage(ErrorTypes.PARSING, error)
  }

  /**
   * 处理生成错误
   */
  const handleGenerationError = (error, context = {}) => {
    logError(error, ErrorTypes.GENERATION, context)
    return getFriendlyErrorMessage(ErrorTypes.GENERATION, error)
  }

  /**
   * 处理文件错误
   */
  const handleFileError = (error, context = {}) => {
    logError(error, ErrorTypes.FILE, context)
    return getFriendlyErrorMessage(ErrorTypes.FILE, error)
  }

  /**
   * 处理网络错误
   */
  const handleNetworkError = (error, context = {}) => {
    logError(error, ErrorTypes.NETWORK, context)
    return getFriendlyErrorMessage(ErrorTypes.NETWORK, error)
  }

  /**
   * 获取友好的错误消息
   */
  const getFriendlyErrorMessage = (type, error) => {
    const baseMessage = typeof error === 'string' ? error : error?.message || '发生未知错误'
    
    switch (type) {
      case ErrorTypes.VALIDATION:
        return `输入验证失败: ${baseMessage}`
      
      case ErrorTypes.PARSING:
        if (baseMessage.includes('DDL') || baseMessage.includes('SQL')) {
          return `SQL解析错误: ${baseMessage}`
        }
        if (baseMessage.includes('Excel') || baseMessage.includes('文件')) {
          return `文件解析错误: ${baseMessage}`
        }
        return `数据解析错误: ${baseMessage}`
      
      case ErrorTypes.GENERATION:
        return `SQL生成错误: ${baseMessage}`
      
      case ErrorTypes.FILE:
        if (baseMessage.includes('格式') || baseMessage.includes('类型')) {
          return `文件格式错误: ${baseMessage}`
        }
        if (baseMessage.includes('大小') || baseMessage.includes('超过')) {
          return `文件大小超出限制: ${baseMessage}`
        }
        return `文件操作错误: ${baseMessage}`
      
      case ErrorTypes.NETWORK:
        return `网络连接错误: ${baseMessage}`
      
      default:
        return `系统错误: ${baseMessage}`
    }
  }

  /**
   * 获取错误统计信息
   */
  const getErrorStats = computed(() => {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000
    
    const recentErrors = errorLogs.value.filter(log => 
      new Date(log.timestamp).getTime() > last24Hours
    )
    
    const typeStats = {}
    Object.values(ErrorTypes).forEach(type => {
      typeStats[type] = recentErrors.filter(log => log.type === type).length
    })
    
    return {
      totalErrors: errorLogs.value.length,
      recentErrors: recentErrors.length,
      unresolvedErrors: errorLogs.value.filter(log => !log.resolved).length,
      typeStats,
      lastError: errorLogs.value[0] || null
    }
  })

  /**
   * 标记错误为已解决
   */
  const markAsResolved = (errorId) => {
    const errorIndex = errorLogs.value.findIndex(log => log.id === errorId)
    if (errorIndex !== -1) {
      errorLogs.value[errorIndex].resolved = true
    }
  }

  /**
   * 批量标记错误为已解决
   */
  const markMultipleAsResolved = (errorIds) => {
    errorIds.forEach(id => markAsResolved(id))
  }

  /**
   * 清除已解决的错误
   */
  const clearResolvedErrors = () => {
    errorLogs.value = errorLogs.value.filter(log => !log.resolved)
  }

  /**
   * 清除所有错误日志
   */
  const clearAllErrors = () => {
    errorLogs.value = []
  }

  /**
   * 导出错误日志
   */
  const exportErrorLogs = (format = 'json') => {
    const logs = {
      errors: errorLogs.value,
      warnings: warningLogs.value,
      infos: infoLogs.value,
      exportTime: new Date().toISOString(),
      stats: getErrorStats.value
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2)
      case 'csv':
        return convertToCSV(logs)
      case 'text':
        return convertToText(logs)
      default:
        return JSON.stringify(logs, null, 2)
    }
  }

  /**
   * 转换为CSV格式
   */
  const convertToCSV = (logs) => {
    let csv = '时间戳,级别,类型,消息,已解决\n'
    
    const allLogs = [
      ...logs.errors.map(log => ({ ...log, level: 'ERROR' })),
      ...logs.warnings.map(log => ({ ...log, level: 'WARNING' })),
      ...logs.infos.map(log => ({ ...log, level: 'INFO' }))
    ]
    
    allLogs.forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN')
      const message = `"${log.message.replace(/"/g, '""')}"`
      const resolved = log.resolved ? '是' : '否'
      
      csv += `${timestamp},${log.level},${log.type},${message},${resolved}\n`
    })
    
    return csv
  }

  /**
   * 转换为文本格式
   */
  const convertToText = (logs) => {
    let text = `错误日志报告 - ${new Date().toLocaleString('zh-CN')}\n`
    text += `========================================\n\n`
    
    text += `错误统计:\n`
    text += `- 总错误数: ${logs.stats.totalErrors}\n`
    text += `- 24小时内错误数: ${logs.stats.recentErrors}\n`
    text += `- 未解决错误数: ${logs.stats.unresolvedErrors}\n\n`
    
    text += `详细日志:\n`
    text += `----------------------------------------\n`
    
    const allLogs = [
      ...logs.errors.map(log => ({ ...log, level: 'ERROR' })),
      ...logs.warnings.map(log => ({ ...log, level: 'WARNING' })),
      ...logs.infos.map(log => ({ ...log, level: 'INFO' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    allLogs.forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN')
      const status = log.resolved ? '[已解决]' : '[未解决]'
      
      text += `[${timestamp}] ${log.level} ${status}\n`
      text += `类型: ${log.type}\n`
      text += `消息: ${log.message}\n`
      if (log.stack) {
        text += `堆栈: ${log.stack}\n`
      }
      text += `\n`
    })
    
    return text
  }

  /**
   * 设置最大日志大小
   */
  const setMaxLogSize = (size) => {
    if (size >= 100 && size <= 10000) {
      maxLogSize.value = size
    } else {
      logWarning('日志大小设置超出范围，使用默认值', ErrorTypes.VALIDATION, { requestedSize: size })
    }
  }

  /**
   * 全局错误捕获
   */
  const setupGlobalErrorHandling = () => {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      logError(event.reason, ErrorTypes.UNKNOWN, { 
        event: 'unhandledrejection',
        promise: event.promise 
      })
    })

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      logError(event.error, ErrorTypes.UNKNOWN, { 
        event: 'global error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno 
      })
    })

    logInfo('全局错误处理已启用')
  }

  return {
    errorLogs: computed(() => errorLogs.value),
    warningLogs: computed(() => warningLogs.value),
    infoLogs: computed(() => infoLogs.value),
    errorStats: getErrorStats,
    
    ErrorTypes,
    ErrorLevels,
    
    logError,
    logWarning,
    logInfo,
    
    handleValidationError,
    handleParsingError,
    handleGenerationError,
    handleFileError,
    handleNetworkError,
    
    markAsResolved,
    markMultipleAsResolved,
    clearResolvedErrors,
    clearAllErrors,
    exportErrorLogs,
    
    setMaxLogSize,
    setupGlobalErrorHandling
  }
}