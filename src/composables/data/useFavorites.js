import { ref, watch } from "vue";
import { message } from "ant-design-vue";

/**
 * 收藏夹管理 Composable
 * 使用 localStorage 持久化收藏的工具
 */
export function useFavorites() {
  const STORAGE_KEY = "sqltool-favorites";

  /**
   * 收藏的工具列表
   */
  const favorites = ref([]);

  /**
   * 从 localStorage 加载收藏
   */
  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        favorites.value = JSON.parse(stored);
      }
    } catch (error) {
      console.error("加载收藏失败:", error);
      favorites.value = [];
    }
  };

  /**
   * 保存收藏到 localStorage
   */
  const saveFavorites = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value));
    } catch (error) {
      console.error("保存收藏失败:", error);
      message.error("保存收藏失败，请检查浏览器存储空间");
    }
  };

  /**
   * 切换收藏状态
   * @param {Object} tool - 工具对象
   */
  const toggleFavorite = (tool) => {
    const index = favorites.value.findIndex((f) => f.id === tool.id);
    if (index > -1) {
      favorites.value.splice(index, 1);
      message.success(`已取消收藏 "${tool.name}"`);
    } else {
      favorites.value.push(tool);
      message.success(`已收藏 "${tool.name}"`);
    }
    saveFavorites();
  };

  /**
   * 检查工具是否已收藏
   * @param {Object} tool - 工具对象
   * @returns {boolean}
   */
  const isFavorite = (tool) => {
    return favorites.value.some((f) => f.id === tool.id);
  };

  /**
   * 清空所有收藏
   */
  const clearFavorites = () => {
    favorites.value = [];
    saveFavorites();
    message.success("已清空所有收藏");
  };

  /**
   * 获取收藏的工具列表
   * @returns {Array}
   */
  const getFavoriteTools = () => {
    return favorites.value;
  };

  /**
   * 监听收藏变化，自动保存
   */
  watch(
    favorites,
    () => {
      saveFavorites();
    },
    { deep: true },
  );

  /**
   * 初始化时加载收藏
   */
  loadFavorites();

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    getFavoriteTools,
  };
}
