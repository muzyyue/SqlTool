import { ref, computed } from "vue";

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

/**
 * 缓存统计接口
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * 默认缓存配置
 */
const DEFAULT_TTL = 1000 * 60 * 30;
const MAX_CACHE_SIZE = 100;

/**
 * 内存缓存存储
 */
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * 缓存统计
 */
const stats = ref({
  hits: 0,
  misses: 0,
});

/**
 * 生成缓存键
 */
export const generateCacheKey = (
  prefix: string,
  ...parts: (string | number | boolean | null | undefined)[]
): string => {
  const normalizedParts = parts.map((part) => {
    if (part === null || part === undefined) return "null";
    if (typeof part === "object") return JSON.stringify(part);
    return String(part);
  });
  return `${prefix}:${normalizedParts.join(":")}`;
};

/**
 * 模型缓存管理 Composable
 */
export function useModelCache() {
  const cacheSize = computed(() => memoryCache.size);

  const cacheStats = computed<CacheStats>(() => ({
    hits: stats.value.hits,
    misses: stats.value.misses,
    size: memoryCache.size,
    hitRate:
      stats.value.hits + stats.value.misses > 0
        ? stats.value.hits / (stats.value.hits + stats.value.misses)
        : 0,
  }));

  /**
   * 获取缓存
   */
  const get = <T>(key: string): T | null => {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      stats.value.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      stats.value.misses++;
      return null;
    }

    entry.hits++;
    stats.value.hits++;
    return entry.data;
  };

  /**
   * 设置缓存
   */
  const set = <T>(key: string, data: T, ttl: number = DEFAULT_TTL): void => {
    if (memoryCache.size >= MAX_CACHE_SIZE) {
      evictOldest();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      hits: 0,
    };

    memoryCache.set(key, entry as CacheEntry<unknown>);
  };

  /**
   * 检查缓存是否存在
   */
  const has = (key: string): boolean => {
    const entry = memoryCache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return false;
    }

    return true;
  };

  /**
   * 删除缓存
   */
  const del = (key: string): boolean => {
    return memoryCache.delete(key);
  };

  /**
   * 清除所有缓存
   */
  const clear = (): void => {
    memoryCache.clear();
    stats.value.hits = 0;
    stats.value.misses = 0;
  };

  /**
   * 清除过期缓存
   */
  const clearExpired = (): number => {
    const now = Date.now();
    let cleared = 0;

    memoryCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        memoryCache.delete(key);
        cleared++;
      }
    });

    return cleared;
  };

  /**
   * 清除特定前缀的缓存
   */
  const clearByPrefix = (prefix: string): number => {
    let cleared = 0;

    memoryCache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
        cleared++;
      }
    });

    return cleared;
  };

  /**
   * 驱逐最旧的条目
   */
  const evictOldest = (): void => {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    memoryCache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  };

  /**
   * 驱逐最少使用的条目
   */
  const evictLeastUsed = (): void => {
    let lruKey: string | null = null;
    let leastHits = Infinity;

    memoryCache.forEach((entry, key) => {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        lruKey = key;
      }
    });

    if (lruKey) {
      memoryCache.delete(lruKey);
    }
  };

  /**
   * 获取或设置缓存（带计算函数）
   */
  const getOrSet = async <T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number = DEFAULT_TTL,
  ): Promise<T> => {
    const cached = get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await compute();
    set(key, data, ttl);
    return data;
  };

  /**
   * 获取缓存条目信息
   */
  const getEntryInfo = (
    key: string,
  ): {
    exists: boolean;
    age: number;
    remainingTtl: number;
    hits: number;
  } | null => {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    return {
      exists: true,
      age: now - entry.timestamp,
      remainingTtl: Math.max(0, entry.expiresAt - now),
      hits: entry.hits,
    };
  };

  return {
    cacheSize,
    cacheStats,

    get,
    set,
    has,
    del,
    clear,
    clearExpired,
    clearByPrefix,

    getOrSet,
    getEntryInfo,

    generateCacheKey,
  };
}

/**
 * IndexedDB 缓存管理（用于大文件如模型文件）
 */
export class IndexedDBCache {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(
    dbName: string = "sqltool_ai_cache",
    storeName: string = "models",
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * 获取数据
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiresAt > Date.now()) {
          resolve(result.data as T);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * 设置数据
   */
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      const entry = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      const request = store.put(entry);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 删除数据
   */
  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 清除所有数据
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * 全局 IndexedDB 缓存实例
 */
let idbCacheInstance: IndexedDBCache | null = null;

/**
 * 获取 IndexedDB 缓存实例
 */
export const getIndexedDBCache = (): IndexedDBCache => {
  if (!idbCacheInstance) {
    idbCacheInstance = new IndexedDBCache();
  }
  return idbCacheInstance;
};
