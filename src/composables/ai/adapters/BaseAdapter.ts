import { ref, computed, readonly } from "vue";
import type {
  IModelAdapter,
  ModelEventListener,
  ModelEvent,
  ModelState,
  ModelResponse,
  GenerateOptions,
  EmbeddingResponse,
  EmbeddingOptions,
  LoadingProgress,
} from "./types";
import { ModelType } from "./types";

/**
 * 模型适配器基类
 * 提供通用的状态管理、事件处理和错误处理功能
 */
export abstract class BaseModelAdapter implements IModelAdapter {
  abstract readonly name: string;
  abstract readonly type: ModelType;

  protected _state = ref<ModelState>("uninitialized" as ModelState);
  protected _listeners: Map<ModelEvent, Set<ModelEventListener>> = new Map();
  protected _loadingProgress = ref<LoadingProgress | null>(null);

  get state(): ModelState {
    return this._state.value;
  }

  get isReady(): boolean {
    return this._state.value === "ready";
  }

  get isLoading(): boolean {
    return this._state.value === "loading";
  }

  get loadingProgress(): LoadingProgress | null {
    return this._loadingProgress.value;
  }

  /**
   * 初始化模型
   */
  abstract initialize(): Promise<void>;

  /**
   * 生成文本
   */
  abstract generate(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<ModelResponse>;

  /**
   * 生成嵌入向量（可选实现）
   */
  async generateEmbedding?(
    _text: string,
    _options?: EmbeddingOptions,
  ): Promise<EmbeddingResponse> {
    throw new Error("当前模型不支持嵌入向量生成");
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this._state.value = "disposed";
    this._loadingProgress.value = null;
    this.emit(ModelEvent.DISPOSED);
    this.removeAllListeners();
  }

  /**
   * 设置状态
   */
  protected setState(newState: ModelState): void {
    const oldState = this._state.value;
    this._state.value = newState;
    this.emit(ModelEvent.STATE_CHANGED, { oldState, newState });
  }

  /**
   * 更新加载进度
   */
  protected updateProgress(
    loaded: number,
    total: number,
    status: string,
  ): void {
    this._loadingProgress.value = {
      loaded,
      total,
      percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
      status,
    };
    this.emit(ModelEvent.LOADING_PROGRESS, this._loadingProgress.value);
  }

  /**
   * 触发错误
   */
  protected emitError(error: Error): void {
    this._state.value = "error";
    this.emit(ModelEvent.ERROR, error);
  }

  /**
   * 添加事件监听器
   */
  addEventListener(event: ModelEvent, listener: ModelEventListener): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: ModelEvent, listener: ModelEventListener): void {
    this._listeners.get(event)?.delete(listener);
  }

  /**
   * 触发事件
   */
  protected emit(event: ModelEvent, data?: unknown): void {
    this._listeners.get(event)?.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error(`模型事件监听器错误 [${event}]:`, error);
      }
    });
  }

  /**
   * 移除所有监听器
   */
  protected removeAllListeners(): void {
    this._listeners.clear();
  }

  /**
   * 验证生成选项
   */
  protected validateOptions(options?: GenerateOptions): GenerateOptions {
    return {
      maxTokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.7,
      topP: options?.topP ?? 0.9,
      topK: options?.topK ?? 50,
      stopSequences: options?.stopSequences ?? [],
      timeout: options?.timeout ?? 60000,
    };
  }

  /**
   * 创建超时 Promise
   */
  protected createTimeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`操作超时 (${ms}ms)`)), ms);
    });
  }

  /**
   * 带超时的 Promise 竞争
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([promise, this.createTimeoutPromise<T>(timeoutMs)]);
  }
}

/**
 * 模型适配器状态 Composable
 */
export function useAdapterState(adapter: BaseModelAdapter) {
  const state = computed(() => readonly(adapter.state));
  const isReady = computed(() => adapter.isReady);
  const isLoading = computed(() => adapter.isLoading);
  const loadingProgress = computed(() => readonly(adapter.loadingProgress));

  const onStateChange = (callback: (state: ModelState) => void) => {
    const listener: ModelEventListener = (_, data) => {
      if (data && typeof data === "object" && "newState" in data) {
        callback((data as { newState: ModelState }).newState);
      }
    };
    adapter.addEventListener("state-changed" as ModelEvent, listener);
    return () =>
      adapter.removeEventListener("state-changed" as ModelEvent, listener);
  };

  const onLoadingProgress = (callback: (progress: LoadingProgress) => void) => {
    const listener: ModelEventListener = (_, data) => {
      if (data) {
        callback(data as LoadingProgress);
      }
    };
    adapter.addEventListener("loading-progress" as ModelEvent, listener);
    return () =>
      adapter.removeEventListener("loading-progress" as ModelEvent, listener);
  };

  const onError = (callback: (error: Error) => void) => {
    const listener: ModelEventListener = (_, data) => {
      if (data instanceof Error) {
        callback(data);
      }
    };
    adapter.addEventListener("error" as ModelEvent, listener);
    return () => adapter.removeEventListener("error" as ModelEvent, listener);
  };

  return {
    state,
    isReady,
    isLoading,
    loadingProgress,
    onStateChange,
    onLoadingProgress,
    onError,
  };
}
