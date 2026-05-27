/**
 * AI 模块类型定义
 * 定义本地模型和 API 模型的统一接口类型
 */

/**
 * 模型类型枚举
 */
export enum ModelType {
  LOCAL = "local",
  API = "api",
}

/**
 * 模型状态枚举
 */
export enum ModelState {
  UNINITIALIZED = "uninitialized",
  LOADING = "loading",
  READY = "ready",
  ERROR = "error",
  DISPOSED = "disposed",
}

/**
 * API 提供商枚举
 */
export enum ApiProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  CUSTOM = "custom",
}

/**
 * 本地模型类型枚举
 */
export enum LocalModelType {
  TEXT_GENERATION = "text-generation",
  EMBEDDING = "embedding",
  QUESTION_ANSWERING = "question-answering",
}

/**
 * 生成选项接口
 */
export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  timeout?: number;
}

/**
 * 嵌入选项接口
 */
export interface EmbeddingOptions {
  normalize?: boolean;
  timeout?: number;
}

/**
 * 模型配置接口
 */
export interface ModelConfig {
  name: string;
  type: ModelType;
  enabled: boolean;
  priority: number;
}

/**
 * 本地模型配置接口
 */
export interface LocalModelConfig extends ModelConfig {
  type: ModelType.LOCAL;
  modelId: string;
  modelType: LocalModelType;
  quantized?: boolean;
  cacheDir?: string;
  maxMemory?: number;
}

/**
 * API 模型配置接口
 */
export interface ApiModelConfig extends ModelConfig {
  type: ModelType.API;
  provider: ApiProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
}

/**
 * 模型响应接口
 */
export interface ModelResponse {
  content: string;
  model: string;
  type: ModelType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
}

/**
 * 嵌入响应接口
 */
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  type: ModelType;
  dimensions: number;
  latency: number;
}

/**
 * 模型适配器接口
 * 所有模型适配器必须实现此接口
 */
export interface IModelAdapter {
  readonly name: string;
  readonly type: ModelType;
  readonly state: ModelState;
  readonly isReady: boolean;

  initialize(): Promise<void>;
  generate(prompt: string, options?: GenerateOptions): Promise<ModelResponse>;
  generateEmbedding?(
    text: string,
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResponse>;
  dispose(): void;
}

/**
 * 模型管理器配置接口
 */
export interface ModelManagerConfig {
  defaultModelType: ModelType;
  autoFallback: boolean;
  fallbackOrder: ModelType[];
  cacheEnabled: boolean;
  maxConcurrentRequests: number;
}

/**
 * 模型事件类型
 */
export enum ModelEvent {
  STATE_CHANGED = "state-changed",
  LOADING_PROGRESS = "loading-progress",
  ERROR = "error",
  READY = "ready",
  DISPOSED = "disposed",
}

/**
 * 模型事件监听器
 */
export type ModelEventListener = (event: ModelEvent, data?: unknown) => void;

/**
 * 模型加载进度
 */
export interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  status: string;
}
