/**
 * 日志文件大小上限：直接验证真实的 useSettings
 *
 * 日志页通过 getSetting("logMaxFileSize") 读取上限。这里测试真实模块的
 * 默认值、持久化与回退行为，而不是在测试里重新实现一遍解析逻辑。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { computed, nextTick } from "vue";
import { useSettings } from "@/composables/core/useSettings.js";

// useSettings 在模块加载时就读取 localStorage，因此需要先准备好存储再动态导入
const loadFresh = async (stored) => {
  vi.resetModules();
  localStorage.clear();
  if (stored !== undefined) {
    localStorage.setItem("sqlToolSettings", JSON.stringify(stored));
  }
  const mod = await import("@/composables/core/useSettings.js");
  return mod.useSettings();
};

describe("日志文件大小上限设置", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("默认值为 20MB", async () => {
    const { getSetting, defaultSettings } = await loadFresh();
    expect(defaultSettings.logMaxFileSize).toBe(20);
    expect(getSetting("logMaxFileSize")).toBe(20);
  });

  it("与 Excel 的 maxFileSize 相互独立", async () => {
    const { getSetting, defaultSettings } = await loadFresh();
    // 两者是不同的键，默认值也不同，避免日志上限被 Excel 的 50MB 覆盖
    expect(defaultSettings.maxFileSize).toBe(50);
    expect(defaultSettings.logMaxFileSize).toBe(20);
  });

  it("可以从 localStorage 恢复自定义值", async () => {
    const { getSetting } = await loadFresh({ logMaxFileSize: 128 });
    expect(getSetting("logMaxFileSize")).toBe(128);
  });

  it("旧版本存储中没有该键时补上默认值", async () => {
    // 模拟升级前保存的设置（不含 logMaxFileSize）
    const { getSetting } = await loadFresh({ themeMode: "dark" });
    expect(getSetting("logMaxFileSize")).toBe(20);
    expect(getSetting("themeMode")).toBe("dark");
  });

  it("updateSetting 修改后会持久化", async () => {
    const { updateSetting, getSetting } = await loadFresh();
    updateSetting("logMaxFileSize", 64);
    expect(getSetting("logMaxFileSize")).toBe(64);
    const saved = JSON.parse(localStorage.getItem("sqlToolSettings"));
    expect(saved.logMaxFileSize).toBe(64);
  });

  it("resetSettings 会恢复为 20", async () => {
    const { updateSetting, resetSettings, getSetting } = await loadFresh();
    updateSetting("logMaxFileSize", 999);
    resetSettings();
    expect(getSetting("logMaxFileSize")).toBe(20);
  });
});

describe("getSetting 在 computed 中的响应性", () => {
  it("修改设置后 computed 会重新求值", async () => {
    const { getSetting, updateSetting } = await loadFresh();

    // 复刻日志页里的用法
    const maxFileSizeMb = computed(() => {
      const v = Number(getSetting("logMaxFileSize"));
      return Number.isFinite(v) && v > 0 ? v : 20;
    });

    expect(maxFileSizeMb.value).toBe(20);

    updateSetting("logMaxFileSize", 88);
    await nextTick();

    // 若 readonly + 直接读 value 不可追踪，这里会是 20，说明改设置后页面不会跟着变
    expect(maxFileSizeMb.value).toBe(88);
  });
});
