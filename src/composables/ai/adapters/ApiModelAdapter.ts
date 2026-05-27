import { BaseModelAdapter } from "./BaseAdapter";
import type { ModelResponse, GenerateOptions, ApiModelConfig } from "../types";
import { ModelType, ApiProvider, ModelState } from "../types";

/**
 * OpenAI API 响应类型
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Anthropic API 响应类型
 */
interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * API 模型适配器
 * 支持 OpenAI 和 Anthropic API
 */
export class ApiModelAdapter extends BaseModelAdapter {
  readonly name: string;
  readonly type = ModelType.API;

  private config: ApiModelConfig;
  private abortController: AbortController | null = null;

  constructor(config: ApiModelConfig) {
    super();
    this.name = config.name;
    this.config = config;
  }

  /**
   * 初始化 API 适配器
   */
  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error(
        `API Key 未配置，请先配置 ${this.config.provider} 的 API Key`,
      );
    }

    this.setState("ready" as ModelState);
    this.emit("ready" as never);
  }

  /**
   * 生成文本
   */
  async generate(
    prompt: string,
    options?: GenerateOptions,
  ): Promise<ModelResponse> {
    if (!this.isReady) {
      await this.initialize();
    }

    const startTime = performance.now();
    const validatedOptions = this.validateOptions(options);

    try {
      let response: ModelResponse;

      switch (this.config.provider) {
        case "openai":
          response = await this.callOpenAI(prompt, validatedOptions);
          break;
        case "anthropic":
          response = await this.callAnthropic(prompt, validatedOptions);
          break;
        case "custom":
          response = await this.callCustomAPI(prompt, validatedOptions);
          break;
        default:
          throw new Error(`不支持的 API 提供商: ${this.config.provider}`);
      }

      response.latency = performance.now() - startTime;
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("请求已取消");
      }
      throw new Error(
        `API 调用失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    options: GenerateOptions,
  ): Promise<ModelResponse> {
    const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;

    this.abortController = new AbortController();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
        stop: options.stopSequences?.length ? options.stopSequences : undefined,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    return {
      content,
      model: data.model,
      type: ModelType.API,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      latency: 0,
    };
  }

  /**
   * 调用 Anthropic API
   */
  private async callAnthropic(
    prompt: string,
    options: GenerateOptions,
  ): Promise<ModelResponse> {
    const baseUrl = this.config.baseUrl || "https://api.anthropic.com/v1";
    const url = `${baseUrl}/messages`;

    this.abortController = new AbortController();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options.maxTokens,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stopSequences?.length
          ? options.stopSequences
          : undefined,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: AnthropicResponse = await response.json();
    const content = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      content,
      model: data.model,
      type: ModelType.API,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      latency: 0,
    };
  }

  /**
   * 调用自定义 API
   */
  private async callCustomAPI(
    prompt: string,
    options: GenerateOptions,
  ): Promise<ModelResponse> {
    if (!this.config.baseUrl) {
      throw new Error("自定义 API 需要配置 Base URL");
    }

    this.abortController = new AbortController();

    const response = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `自定义 API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    const content =
      data.choices?.[0]?.message?.content ||
      data.response ||
      data.text ||
      data.content ||
      "";

    return {
      content,
      model: this.config.model || "custom",
      type: ModelType.API,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      latency: 0,
    };
  }

  /**
   * 取消当前请求
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.cancelRequest();
    super.dispose();
  }

  /**
   * 获取 API 信息
   */
  getApiInfo(): {
    provider: ApiProvider;
    model: string;
    baseUrl: string;
  } {
    return {
      provider: this.config.provider,
      model: this.config.model,
      baseUrl: this.config.baseUrl || "",
    };
  }
}

/**
 * 创建 OpenAI 适配器
 */
export function createOpenAIAdapter(
  config: Omit<ApiModelConfig, "provider" | "type">,
): ApiModelAdapter {
  return new ApiModelAdapter({
    ...config,
    provider: "openai",
    type: ModelType.API,
  });
}

/**
 * 创建 Anthropic 适配器
 */
export function createAnthropicAdapter(
  config: Omit<ApiModelConfig, "provider" | "type">,
): ApiModelAdapter {
  return new ApiModelAdapter({
    ...config,
    provider: "anthropic",
    type: ModelType.API,
  });
}

/**
 * 创建自定义 API 适配器
 */
export function createCustomAPIAdapter(
  config: Omit<ApiModelConfig, "type">,
): ApiModelAdapter {
  return new ApiModelAdapter({
    ...config,
    type: ModelType.API,
  });
}
