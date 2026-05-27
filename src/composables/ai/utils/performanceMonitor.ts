/**
 * AI 性能监控工具
 * 用于监控 AI 模块的加载时间、推理性能等指标
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  /** 指标名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 持续时间（ms） */
  duration?: number;
  /** 额外信息 */
  metadata?: Record<string, unknown>;
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];

  /**
   * 开始计时
   * @param name - 指标名称
   * @param metadata - 额外信息
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };
    this.metrics.set(name, metric);
  }

  /**
   * 结束计时
   * @param name - 指标名称
   * @returns 性能指标
   */
  end(name: string): PerformanceMetric | undefined {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[PerformanceMonitor] 未找到指标: ${name}`);
      return undefined;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.metrics.delete(name);
    this.completedMetrics.push(metric);

    // 输出性能日志
    console.log(
      `[PerformanceMonitor] ${name}: ${metric.duration.toFixed(2)}ms`,
      metric.metadata || "",
    );

    return metric;
  }

  /**
   * 获取所有已完成的指标
   */
  getCompletedMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  /**
   * 获取指定指标的统计信息
   * @param name - 指标名称
   */
  getMetricStats(name: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  } | null {
    const metrics = this.completedMetrics.filter((m) => m.name === name);
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration || 0);
    return {
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  /**
   * 导出性能报告
   */
  exportReport(): {
    metrics: PerformanceMetric[];
    summary: Record<string, ReturnType<PerformanceMonitor["getMetricStats"]>>;
  } {
    const metricNames = new Set(this.completedMetrics.map((m) => m.name));
    const summary: Record<
      string,
      ReturnType<PerformanceMonitor["getMetricStats"]>
    > = {};

    metricNames.forEach((name) => {
      summary[name] = this.getMetricStats(name);
    });

    return {
      metrics: this.completedMetrics,
      summary,
    };
  }
}

/**
 * 全局性能监控实例
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能计时装饰器
 * 用于自动测量函数执行时间
 * @param name - 指标名称
 */
export function measurePerformance(name: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      performanceMonitor.start(name);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(name);
        return result;
      } catch (error) {
        performanceMonitor.end(name);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 测量异步函数性能
 * @param name - 指标名称
 * @param fn - 要测量的函数
 * @param metadata - 额外信息
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  performanceMonitor.start(name, metadata);
  try {
    const result = await fn();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}

/**
 * 测量同步函数性能
 * @param name - 指标名称
 * @param fn - 要测量的函数
 * @param metadata - 额外信息
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>,
): T {
  performanceMonitor.start(name, metadata);
  try {
    const result = fn();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}
