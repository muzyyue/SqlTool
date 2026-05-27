import { ref, readonly } from "vue";

const SETTINGS_KEY = "sqlToolSettings";

const defaultSettings = {
  themeMode: "light",
  language: "zh-CN",
  layoutMode: "fluid",
  confirmDialogs: true,
  autoSave: true,
  saveInterval: 5,
  defaultDatabase: "mysql",
  sqlFormat: "formatted",
  batchSize: 100,
  includeComments: true,
  defaultMatchingAlgorithm: "similarity",
  similarityThreshold: 0.3,
  autoMapping: true,
  maxFileSize: 50,
  supportedFormats: ["xlsx", "xls", "csv"],
  chunkProcessing: true,
  chunkSize: 1000,
  defaultExportFormat: "sql",
  fileEncoding: "utf-8",
  autoDownload: false,
  cacheSize: 100,
  parallelProcessing: false,
  logLevel: "info",
  developerMode: false,
  consoleLogging: false,
  performanceMonitoring: false,
};

const settings = ref({ ...defaultSettings });

const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      settings.value = { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error("加载设置失败:", error);
  }
};

const saveSettings = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value));
    return true;
  } catch (error) {
    console.error("保存设置失败:", error);
    return false;
  }
};

const updateSetting = (key, value) => {
  if (key in settings.value) {
    settings.value[key] = value;
    saveSettings();
  }
};

const updateSettings = (newSettings) => {
  settings.value = { ...settings.value, ...newSettings };
  saveSettings();
};

const resetSettings = () => {
  settings.value = { ...defaultSettings };
  saveSettings();
};

const getSetting = (key) => {
  return settings.value[key];
};

loadSettings();

export function useSettings() {
  return {
    settings: readonly(settings),
    loadSettings,
    saveSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    getSetting,
    defaultSettings,
  };
}
