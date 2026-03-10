import { BaseModelAdapter } from './BaseAdapter'
import type {
  ModelResponse,
  GenerateOptions,
  EmbeddingResponse,
  EmbeddingOptions,
  LocalModelConfig,
  LoadingProgress,
} from '../types'
import { ModelType, LocalModelType, ModelState } from '../types'

/**
 * Transformers.js 动态导入类型
 */
interface TransformersModule {
  pipeline: (
    task: string,
    model: string,
    options?: {
      quantized?: boolean
      progress_callback?: (progress: LoadingProgress) => void
    }
  ) => Promise<unknown>
  env: {
    allowLocalModels: boolean
    useBrowserCache: boolean
  }
}

/**
 * 文本生成管道类型
 */
interface TextGenerationPipeline {
  (
    input: string,
    options?: {
      max_new_tokens?: number
      temperature?: number
      top_p?: number
      top_k?: number
      do_sample?: boolean
      return_full_text?: boolean
    }
  ): Promise<{ generated_text: string }[]>
}

/**
 * 嵌入管道类型
 */
interface EmbeddingPipeline {
  (input: string): Promise<{ data: number[][] }[]>
}

/**
 * 本地模型适配器
 * 使用 Transformers.js 在浏览器中运行模型
 */
export class LocalModelAdapter extends BaseModelAdapter {
  readonly name: string
  readonly type = ModelType.LOCAL

  private config: LocalModelConfig
  private transformers: TransformersModule | null = null
  private textPipeline: TextGenerationPipeline | null = null
  private embeddingPipeline: EmbeddingPipeline | null = null
  private initPromise: Promise<void> | null = null

  constructor(config: LocalModelConfig) {
    super()
    this.name = config.name
    this.config = config
  }

  /**
   * 初始化模型
   */
  async initialize(): Promise<void> {
    if (this._state.value === 'ready') {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  /**
   * 执行初始化
   */
  private async doInitialize(): Promise<void> {
    try {
      this.setState('loading' as ModelState)
      this.updateProgress(0, 100, '正在加载 Transformers.js...')

      this.transformers = await this.loadTransformers()

      this.updateProgress(10, 100, '正在配置运行环境...')
      this.configureEnvironment()

      if (this.config.modelType === LocalModelType.TEXT_GENERATION || !this.config.modelType) {
        this.updateProgress(20, 100, '正在加载文本生成模型...')
        this.textPipeline = await this.loadTextPipeline()
      }

      if (this.config.modelType === LocalModelType.EMBEDDING) {
        this.updateProgress(20, 100, '正在加载嵌入模型...')
        this.embeddingPipeline = await this.loadEmbeddingPipeline()
      }

      this.setState('ready' as ModelState)
      this.emit('ready' as never)
      this.updateProgress(100, 100, '模型加载完成')
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      this.initPromise = null
    }
  }

  /**
   * 动态加载 Transformers.js
   * 使用动态导入实现按需加载，减小首屏体积
   */
  private async loadTransformers(): Promise<TransformersModule> {
    const startTime = performance.now()
    
    try {
      // 使用动态导入，Vite 会自动将其分割为独立 chunk
      const module = await import('@xenova/transformers')
      
      const loadTime = performance.now() - startTime
      console.log(`[AI] Transformers.js 加载完成，耗时: ${loadTime.toFixed(2)}ms`)
      
      return module as TransformersModule
    } catch (error) {
      const loadTime = performance.now() - startTime
      console.error(`[AI] 加载 Transformers.js 失败 (耗时: ${loadTime.toFixed(2)}ms):`, error)
      
      // 提供更详细的错误信息
      let errorMessage = '无法加载本地模型运行时。'
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage += '网络连接失败，请检查网络设置。'
        } else if (error.message.includes('ChunkLoadError')) {
          errorMessage += '资源加载失败，请刷新页面重试。'
        } else {
          errorMessage += `错误: ${error.message}`
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  /**
   * 配置运行环境
   */
  private configureEnvironment(): void {
    if (!this.transformers) return

    this.transformers.env.allowLocalModels = false
    this.transformers.env.useBrowserCache = true
  }

  /**
   * 加载文本生成管道
   * 提供详细的加载进度反馈
   */
  private async loadTextPipeline(): Promise<TextGenerationPipeline> {
    if (!this.transformers) {
      throw new Error('Transformers.js 未初始化')
    }

    const pipeline = this.transformers.pipeline
    const startTime = performance.now()

    /**
     * 进度回调函数
     * 监听模型下载和加载进度
     */
    const progressCallback = (progress: LoadingProgress) => {
      if (progress.status === 'progress') {
        // 计算总体进度：20% ~ 90%（模型下载）
        const overallProgress = 20 + Math.round((progress.percentage / 100) * 70)
        
        // 提供更详细的进度信息
        let progressMessage = `正在下载模型: ${progress.percentage.toFixed(1)}%`
        
        if (progress.file) {
          progressMessage += ` (${progress.file})`
        }
        
        this.updateProgress(overallProgress, 100, progressMessage)
      } else if (progress.status === 'done') {
        this.updateProgress(90, 100, '模型下载完成，正在初始化...')
      } else if (progress.status === 'loading') {
        this.updateProgress(92, 100, '正在加载模型到内存...')
      }
    }

    try {
      console.log(`[AI] 开始加载文本生成模型: ${this.config.modelId}`)
      
      const textPipeline = await pipeline('text-generation', this.config.modelId, {
        quantized: this.config.quantized ?? true,
        progress_callback: progressCallback,
      })

      const loadTime = performance.now() - startTime
      console.log(`[AI] 文本生成模型加载完成，耗时: ${(loadTime / 1000).toFixed(2)}s`)

      return textPipeline as TextGenerationPipeline
    } catch (error) {
      const loadTime = performance.now() - startTime
      console.error(`[AI] 加载文本生成模型失败 (耗时: ${(loadTime / 1000).toFixed(2)}s):`, error)
      
      throw new Error(
        `加载文本生成模型失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 加载嵌入管道
   * 提供详细的加载进度反馈
   */
  private async loadEmbeddingPipeline(): Promise<EmbeddingPipeline> {
    if (!this.transformers) {
      throw new Error('Transformers.js 未初始化')
    }

    const embeddingModel = this.config.modelId.includes('embed')
      ? this.config.modelId
      : 'Xenova/all-MiniLM-L6-v2'

    const pipeline = this.transformers.pipeline
    const startTime = performance.now()

    try {
      console.log(`[AI] 开始加载嵌入模型: ${embeddingModel}`)
      
      const embPipeline = await pipeline('feature-extraction', embeddingModel, {
        quantized: this.config.quantized ?? true,
      })

      const loadTime = performance.now() - startTime
      console.log(`[AI] 嵌入模型加载完成，耗时: ${(loadTime / 1000).toFixed(2)}s`)

      return embPipeline as EmbeddingPipeline
    } catch (error) {
      const loadTime = performance.now() - startTime
      console.error(`[AI] 加载嵌入模型失败 (耗时: ${(loadTime / 1000).toFixed(2)}s):`, error)
      
      throw new Error(
        `加载嵌入模型失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 生成文本
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<ModelResponse> {
    if (!this.isReady || !this.textPipeline) {
      await this.initialize()
    }

    if (!this.textPipeline) {
      throw new Error('文本生成模型未初始化')
    }

    const startTime = performance.now()
    const validatedOptions = this.validateOptions(options)

    try {
      const result = await this.withTimeout(
        this.textPipeline(prompt, {
          max_new_tokens: validatedOptions.maxTokens,
          temperature: validatedOptions.temperature,
          top_p: validatedOptions.topP,
          top_k: validatedOptions.topK,
          do_sample: validatedOptions.temperature > 0,
          return_full_text: false,
        }),
        validatedOptions.timeout!
      )

      const generatedText = Array.isArray(result) ? result[0]?.generated_text : ''

      const endTime = performance.now()

      return {
        content: generatedText || '',
        model: this.config.modelId,
        type: ModelType.LOCAL,
        latency: endTime - startTime,
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(generatedText || ''),
          totalTokens: this.estimateTokens(prompt) + this.estimateTokens(generatedText || ''),
        },
      }
    } catch (error) {
      throw new Error(
        `本地模型生成失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbedding(text: string, _options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.embeddingPipeline) {
      if (!this.transformers) {
        await this.initialize()
      }

      if (!this.transformers) {
        throw new Error('Transformers.js 未初始化')
      }

      const embeddingModel = 'Xenova/all-MiniLM-L6-v2'
      const pipeline = this.transformers.pipeline
      this.embeddingPipeline = (await pipeline('feature-extraction', embeddingModel, {
        quantized: true,
      })) as EmbeddingPipeline
    }

    const startTime = performance.now()

    try {
      const result = await this.embeddingPipeline(text)
      const embedding = Array.isArray(result) ? result[0]?.data?.[0] || [] : []

      const endTime = performance.now()

      return {
        embedding,
        model: 'Xenova/all-MiniLM-L6-v2',
        type: ModelType.LOCAL,
        dimensions: embedding.length,
        latency: endTime - startTime,
      }
    } catch (error) {
      throw new Error(
        `嵌入向量生成失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 估算 Token 数量（简单估算）
   */
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const otherChars = text.length - chineseChars - englishWords * 5

    return Math.ceil(chineseChars * 1.5 + englishWords + otherChars * 0.5)
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.textPipeline = null
    this.embeddingPipeline = null
    this.transformers = null
    this.initPromise = null
    super.dispose()
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): {
    modelId: string
    quantized: boolean
    memoryUsage?: number
  } {
    return {
      modelId: this.config.modelId,
      quantized: this.config.quantized ?? true,
    }
  }
}

/**
 * 创建本地模型适配器
 */
export function createLocalModelAdapter(config: LocalModelConfig): LocalModelAdapter {
  return new LocalModelAdapter(config)
}
