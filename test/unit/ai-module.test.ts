import { describe, it, expect, beforeEach, vi } from "vitest";
import { ModelType, ModelState, ApiProvider } from "@/composables/ai/types";
import { useAiConfig } from "@/composables/ai/useAiConfig";
import {
  useModelCache,
  generateCacheKey,
} from "@/composables/ai/utils/modelCache";
import {
  useAiErrorHandler,
  parseErrorType,
  AiErrorType,
} from "@/composables/ai/utils/errorHandler";

describe("AI 模块测试", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("useAiConfig", () => {
    it("应该正确初始化默认配置", () => {
      const config = useAiConfig();

      expect(config.isLocalModelEnabled.value).toBe(true);
      expect(config.defaultModelType.value).toBe(ModelType.LOCAL);
      expect(config.isAnyProviderConfigured.value).toBe(false);
    });

    it("应该正确设置和获取 API Key", () => {
      const config = useAiConfig();

      config.setApiKey(ApiProvider.OPENAI, "test-api-key-12345");

      expect(config.getApiKey(ApiProvider.OPENAI)).toBe("test-api-key-12345");
      expect(config.isAnyProviderConfigured.value).toBe(true);
    });

    it("应该正确清除 API Key", () => {
      const config = useAiConfig();

      config.setApiKey(ApiProvider.OPENAI, "test-api-key-12345");
      config.clearApiKey(ApiProvider.OPENAI);

      expect(config.getApiKey(ApiProvider.OPENAI)).toBe("");
      expect(config.isAnyProviderConfigured.value).toBe(false);
    });

    it("应该正确设置默认模型类型", () => {
      const config = useAiConfig();

      config.setDefaultModelType(ModelType.API);

      expect(config.defaultModelType.value).toBe(ModelType.API);
    });

    it("应该正确设置本地模型配置", () => {
      const config = useAiConfig();

      config.setLocalModelConfig("Xenova/test-model", false);

      expect(config.config.value.localModel.modelId).toBe("Xenova/test-model");
      expect(config.config.value.localModel.quantized).toBe(false);
    });

    it("应该正确导出配置", () => {
      const config = useAiConfig();

      config.setApiKey(ApiProvider.OPENAI, "test-key");
      const exported = config.exportConfig();
      const parsed = JSON.parse(exported);

      expect(parsed.providers.openai.hasApiKey).toBe(true);
    });

    it("应该正确导入配置", () => {
      const config = useAiConfig();

      const importJson = JSON.stringify({
        defaultModelType: ModelType.API,
        autoFallback: false,
        localModel: {
          modelId: "test-model",
          quantized: false,
        },
      });

      const result = config.importConfig(importJson);

      expect(result).toBe(true);
      expect(config.defaultModelType.value).toBe(ModelType.API);
      expect(config.config.value.autoFallback).toBe(false);
    });
  });

  describe("useModelCache", () => {
    it("应该正确生成缓存键", () => {
      const key1 = generateCacheKey("test", "a", "b", "c");
      const key2 = generateCacheKey("test", "a", "b", "d");

      expect(key1).toBe("test:a:b:c");
      expect(key2).toBe("test:a:b:d");
    });

    it("应该正确设置和获取缓存", () => {
      const cache = useModelCache();

      cache.set("test-key", { data: "test-value" });
      const result = cache.get<{ data: string }>("test-key");

      expect(result).not.toBeNull();
      expect(result?.data).toBe("test-value");
    });

    it("应该正确检查缓存是否存在", () => {
      const cache = useModelCache();

      cache.set("exists-key", "value");

      expect(cache.has("exists-key")).toBe(true);
      expect(cache.has("not-exists-key")).toBe(false);
    });

    it("应该正确删除缓存", () => {
      const cache = useModelCache();

      cache.set("delete-key", "value");
      expect(cache.has("delete-key")).toBe(true);

      cache.del("delete-key");
      expect(cache.has("delete-key")).toBe(false);
    });

    it("应该正确清除所有缓存", () => {
      const cache = useModelCache();

      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.clear();

      expect(cache.cacheSize.value).toBe(0);
    });

    it("应该正确处理过期缓存", async () => {
      const cache = useModelCache();

      cache.set("expire-key", "value", 100);

      expect(cache.get("expire-key")).toBe("value");

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get("expire-key")).toBeNull();
    });

    it("应该正确统计缓存命中率", () => {
      const cache = useModelCache();

      cache.clear();
      cache.set("hit-key", "value");

      cache.get("hit-key");
      cache.get("miss-key");

      expect(cache.cacheStats.value.hits).toBeGreaterThanOrEqual(1);
      expect(cache.cacheStats.value.misses).toBeGreaterThanOrEqual(1);
    });
  });

  describe("useAiErrorHandler", () => {
    it("应该正确记录错误", () => {
      const handler = useAiErrorHandler();

      handler.logError(new Error("测试错误"));

      expect(handler.errorCount.value).toBe(1);
      expect(handler.lastError.value).not.toBeNull();
    });

    it("应该正确解析错误类型", () => {
      expect(parseErrorType(new Error("timeout error"))).toBe(
        AiErrorType.TIMEOUT,
      );
      expect(parseErrorType(new Error("network error"))).toBe(
        AiErrorType.NETWORK,
      );
      expect(parseErrorType(new Error("rate limit exceeded"))).toBe(
        AiErrorType.RATE_LIMIT,
      );
      expect(parseErrorType(new Error("unauthorized: 401"))).toBe(
        AiErrorType.API_KEY_INVALID,
      );
      expect(parseErrorType(new Error("unknown error"))).toBe(
        AiErrorType.UNKNOWN,
      );
    });

    it("应该正确判断错误是否可恢复", () => {
      const handler = useAiErrorHandler();

      const networkError = handler.logError(new Error("network error"));
      expect(networkError.recoverable).toBe(true);

      const apiKeyError = handler.logError(new Error("unauthorized: 401"));
      expect(apiKeyError.recoverable).toBe(false);
    });

    it("应该正确清除错误", () => {
      const handler = useAiErrorHandler();

      handler.logError(new Error("error1"));
      handler.logError(new Error("error2"));

      expect(handler.errorCount.value).toBe(2);

      handler.clearErrors();

      expect(handler.errorCount.value).toBe(0);
    });

    it("应该正确重试操作", async () => {
      const handler = useAiErrorHandler();

      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("timeout error");
        }
        return "success";
      };

      const result = await handler.withRetry(operation, 3, 10);

      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });
  });

  describe("类型定义", () => {
    it("应该正确定义模型类型枚举", () => {
      expect(ModelType.LOCAL).toBe("local");
      expect(ModelType.API).toBe("api");
    });

    it("应该正确定义模型状态枚举", () => {
      expect(ModelState.UNINITIALIZED).toBe("uninitialized");
      expect(ModelState.LOADING).toBe("loading");
      expect(ModelState.READY).toBe("ready");
      expect(ModelState.ERROR).toBe("error");
      expect(ModelState.DISPOSED).toBe("disposed");
    });

    it("应该正确定义 API 提供商枚举", () => {
      expect(ApiProvider.OPENAI).toBe("openai");
      expect(ApiProvider.ANTHROPIC).toBe("anthropic");
      expect(ApiProvider.CUSTOM).toBe("custom");
    });
  });
});
