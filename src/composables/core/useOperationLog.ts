/**
 * 操作日志 Composable
 * 提供操作日志记录、格式化和导出功能
 */

import { ref } from "vue";
import { message } from "ant-design-vue";

/**
 * 日志级别
 */
export type LogLevel = "info" | "warning" | "error";

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * 操作日志 Composable
 * @returns {Object} 操作日志相关的状态和方法
 */
export function useOperationLog() {
  const operationLogs = ref<LogEntry[]>([]);

  /**
   * 生成唯一 ID
   * @returns {string} 唯一 ID
   */
  const generateId = (): string => {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * 记录信息日志
   * @param {string} msg - 日志消息
   * @param {string} type - 日志类型
   * @param {Record<string, any>} context - 日志上下文
   */
  const logInfo = (
    msg: string,
    type?: string,
    context?: Record<string, any>,
  ) => {
    operationLogs.value.unshift({
      id: generateId(),
      message: msg,
      level: "info",
      timestamp: new Date(),
      context: { ...context, type },
    });
  };

  /**
   * 记录警告日志
   * @param {string} msg - 日志消息
   * @param {string} type - 日志类型
   * @param {Record<string, any>} context - 日志上下文
   */
  const logWarning = (
    msg: string,
    type?: string,
    context?: Record<string, any>,
  ) => {
    operationLogs.value.unshift({
      id: generateId(),
      message: msg,
      level: "warning",
      timestamp: new Date(),
      context: { ...context, type },
    });
  };

  /**
   * 记录错误日志
   * @param {string} msg - 日志消息
   * @param {string} type - 日志类型
   * @param {Record<string, any>} context - 日志上下文
   */
  const logError = (
    msg: string,
    type?: string,
    context?: Record<string, any>,
  ) => {
    operationLogs.value.unshift({
      id: generateId(),
      message: msg,
      level: "error",
      timestamp: new Date(),
      context: { ...context, type },
    });
  };

  /**
   * 获取日志颜色
   * @param {LogLevel} level - 日志级别
   * @param {string} operationType - 操作类型
   * @returns {string} 颜色值
   */
  const getLogColor = (level: LogLevel, operationType?: string): string => {
    if (operationType === "beautify") {
      return "green";
    }

    const colors: Record<LogLevel, string> = {
      info: "blue",
      warning: "orange",
      error: "red",
    };
    return colors[level] || "gray";
  };

  /**
   * 格式化时间
   * @param {Date} timestamp - 时间戳
   * @returns {string} 格式化后的时间字符串
   */
  const formatTime = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString("zh-CN");
  };

  /**
   * 格式化日志消息
   * @param {LogEntry} log - 日志条目
   * @returns {string} 格式化后的消息
   */
  const formatLogMessage = (log: LogEntry): string => {
    let formattedMessage = log.message;

    if (log.context && log.context.operationType === "beautify") {
      const operation = log.context.operation || "unknown";

      switch (operation) {
        case "toggleBeautifyOptions": {
          const isVisible = log.context.isVisible ? "显示" : "隐藏";
          formattedMessage += ` (${isVisible}美化选项面板)`;
          break;
        }

        case "applyBeautifyOptions":
          if (log.context.changes && log.context.changes.length > 0) {
            formattedMessage += ` (变更: ${log.context.changes.join(", ")})`;
          }
          break;

        case "resetBeautifyOptions":
          if (log.context.changes && log.context.changes.length > 0) {
            formattedMessage += ` (重置项: ${log.context.changes.join(", ")})`;
          }
          break;
      }

      if (log.context.options) {
        const options = log.context.options;
        const summary = `[缩进:${options.indentSpaces}空格, 风格:${options.formatStyle}, 关键字:${options.keywordCase}]`;
        formattedMessage += ` ${summary}`;
      }
    }

    return formattedMessage;
  };

  /**
   * 清除所有日志
   */
  const clearLogs = () => {
    operationLogs.value = [];
    logInfo("操作日志已清除");
  };

  /**
   * 导出日志
   * @returns {string} 导出的日志内容
   */
  const exportLogs = (): string => {
    const logContent = operationLogs.value
      .map((log) => {
        const time = formatTime(log.timestamp);
        const level = log.level.toUpperCase();
        const message = formatLogMessage(log);
        return `[${time}] [${level}] ${message}`;
      })
      .join("\n");

    return logContent;
  };

  /**
   * 下载日志文件
   */
  const downloadLogs = () => {
    if (operationLogs.value.length === 0) {
      message.info("暂无日志可导出");
      return;
    }

    const content = exportLogs();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operation_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success("日志导出成功");
  };

  return {
    operationLogs,
    logInfo,
    logWarning,
    logError,
    getLogColor,
    formatTime,
    formatLogMessage,
    clearLogs,
    exportLogs,
    downloadLogs,
  };
}
