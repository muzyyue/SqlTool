<template>
  <div class="param-extract-page">
    <!-- 背景纹理层 -->
    <div class="background-texture" aria-hidden="true"></div>

    <!-- 主内容区 -->
    <div class="page-container">
      <!-- 页面标题区域 -->
      <header class="page-header">
        <div class="eyebrow-tag">SQL Extraction</div>
        <h1 class="page-title">
          <span class="title-icon-wrapper">
            <SearchOutlined class="title-icon" />
          </span>
          SQL 语句提取工具
        </h1>
        <p class="page-subtitle">
          从混合文本中智能识别并提取 SQL 语句，支持多种数据库语法
        </p>
      </header>

      <!-- Bento Grid 主布局 -->
      <main class="bento-grid">
        <!-- 左侧：输入面板（占据 8 列，跨 2 行） -->
        <section
          class="input-panel bento-item bento-input"
          aria-label="输入区域"
        >
          <TextInputPanel
            v-model="extractor.state.inputText"
            :loading="isLoading"
            @extract="handleExtract"
            @clear="handleClear"
          />
        </section>

        <!-- 右上：统计栏（占据 4 列） -->
        <section
          class="stats-panel bento-item bento-stats"
          aria-label="统计信息"
        >
          <ExtractStatsBar
            :stats="extractor.state.stats"
            @filter="handleFilter"
          />
        </section>

        <!-- 右下：结果列表（占据 4 列） -->
        <section
          class="result-panel bento-item bento-results"
          aria-label="提取结果"
        >
          <ExtractResultList
            :items="filteredItems"
            :loading="isLoading"
            @select="handleSelectItem"
            @copy="handleCopyItem"
            @copy-all="handleCopyAll"
          />
        </section>
      </main>

      <!-- 详情查看器（可折叠面板） -->
      <aside
        v-if="hasSelectedItem"
        class="detail-panel"
        aria-label="详情查看器"
      >
        <div class="detail-header">
          <div class="detail-title">
            <FileTextOutlined class="detail-icon" />
            <span>详情查看器</span>
          </div>
        </div>
        <div class="detail-content">
          <component
            :is="detailComponentType"
            :item="extractor.state.selectedItem"
            class="detail-viewer"
          />
        </div>
      </aside>

      <!-- 空状态提示 -->
      <div
        v-else-if="!isLoading && !hasResults"
        class="empty-state bento-item"
        aria-label="空状态"
      >
        <div class="empty-illustration">
          <div class="empty-icon-circle">
            <SearchOutlined class="empty-icon" />
          </div>
        </div>
        <h3 class="empty-title">等待输入</h3>
        <p class="empty-description">
          请在上方输入包含 SQL 语句的文本内容，点击提取按钮开始分析
        </p>
        <div class="empty-hints">
          <div class="hint-item">
            <CodeOutlined class="hint-icon" />
            <span>支持 SELECT/INSERT/UPDATE/DELETE</span>
          </div>
          <div class="hint-item">
            <ApartmentOutlined class="hint-icon" />
            <span>支持 DDL/DCL/TCL 语句</span>
          </div>
          <div class="hint-item">
            <FileTextOutlined class="hint-icon" />
            <span>支持 CTE/MERGE/存储过程</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 Modal -->
    <a-modal
      v-model:open="showErrorModal"
      title="提取错误"
      :footer="null"
      class="error-modal"
    >
      <a-alert
        type="error"
        :message="extractor.state.lastError || '未知错误'"
        show-icon
      />
    </a-modal>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import {
  SearchOutlined,
  FileTextOutlined,
  CodeOutlined,
  ApartmentOutlined,
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import TextInputPanel from "@/components/param-extract/TextInputPanel.vue";
import ExtractResultList from "@/components/param-extract/ExtractResultList.vue";
import ExtractStatsBar from "@/components/param-extract/ExtractStatsBar.vue";
import { useParamExtractor } from "@/composables/useParamExtractor";

const extractor = useParamExtractor();

// 直接解构 computed 属性和 reactive 状态（无需 toRefs）
const { isLoading, filteredItems, hasResults, hasSelectedItem } = extractor;

/**
 * 选中的详情查看器组件类型（仅SQL）
 */
const detailComponentType = computed(() => {
  if (!extractor.state.selectedItem) return null;
  return "SqlDetailViewer";
});

const showErrorModal = ref(false);

onMounted(() => {
  initAnimations();
});

onUnmounted(() => {
  extractor.cleanup();
});

function initAnimations() {
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  );

  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
    observer.observe(el);
  });
}

async function handleExtract() {
  await extractor.extract();

  if (extractor.state.lastError) {
    showErrorModal.value = true;
    message.error("提取失败，请检查输入内容");
  } else if (hasResults.value) {
    const count = extractor.state.stats.total;
    message.success(`成功提取 ${count} 条结果`);
  }
}

function handleClear() {
  extractor.clearResults();
  message.info("已清空所有结果");
}

function handleSelectItem(item) {
  extractor.selectItem(item);
}

async function handleCopyItem(item) {
  const success = await extractor.copyItem(item);
  if (success) {
    message.success("已复制到剪贴板");
  } else {
    message.error("复制失败");
  }
}

async function handleCopyAll() {
  const success = await extractor.copyAll();
  if (success) {
    message.success("已复制全部结果到剪贴板");
  } else {
    message.error("复制失败");
  }
}

function handleFilter(filterKey) {
  if (
    filterKey === "success" ||
    filterKey === "warning" ||
    filterKey === "error"
  ) {
    extractor.setFilter(undefined, filterKey);
  }
}
</script>

<style lang="scss" scoped>
.param-extract-page {
  position: relative;
  min-height: 100dvh;
  background: var(--bg-base);
  overflow-x: hidden;
  contain: layout style paint;
  overscroll-behavior-y: contain;

  .background-texture {
    position: fixed;
    inset: 0;
    z-index: 0;
    opacity: 0.15;
    background-image:
      radial-gradient(
        circle at 20% 50%,
        rgba(22, 119, 255, 0.08) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 80%,
        rgba(168, 85, 247, 0.06) 0%,
        transparent 50%
      );
    pointer-events: none;
    transform: translateZ(0);
    will-change: transform;
  }

  .page-container {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 48px 32px 64px;
    content-visibility: auto;
    contain-intrinsic-size: auto 100vh;
  }

  .page-header {
    text-align: center;
    margin-bottom: 56px;
    animation: fadeInUp 0.6s cubic-bezier(0.32, 0.72, 0, 1) both;

    .eyebrow-tag {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      margin-bottom: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--color-primary);
      background: var(--color-primary-bg);
      border: 1px solid var(--color-primary-border);
      border-radius: 9999px;
    }

    .page-title {
      font-size: clamp(36px, 5vw, 56px);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--text-primary);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;

      .title-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        background: linear-gradient(
          135deg,
          var(--color-primary) 0%,
          var(--color-primary-hover) 100%
        );
        border-radius: 16px;
        box-shadow:
          0 4px 12px rgba(22, 119, 255, 0.25),
          inset 0 1px 1px rgba(255, 255, 255, 0.2);

        .title-icon {
          font-size: 28px;
          color: white;
        }
      }
    }

    .page-subtitle {
      font-size: 17px;
      font-weight: 400;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 520px;
      margin: 0 auto;
    }
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
    margin-bottom: 24px;
    contain: content;

    .bento-item {
      animation: fadeInUp 0.6s cubic-bezier(0.32, 0.72, 0, 1) both;

      &:nth-child(1) {
        animation-delay: 0.1s;
      }

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.3s;
      }
    }

    .bento-input {
      grid-column: span 8;
      grid-row: span 2;
    }

    .bento-stats {
      grid-column: span 4;
    }

    .bento-results {
      grid-column: span 4;
    }
  }

  .detail-panel {
    background: var(--bg-elevated);
    border-radius: 20px;
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
    min-height: 380px;
    contain: layout style;

    .detail-header {
      display: flex;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-default);

      .detail-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);

        .detail-icon {
          font-size: 18px;
          color: var(--color-primary);
        }
      }
    }

    .detail-content {
      border-top: 1px solid var(--border-default);
      min-height: 300px;
      overflow: auto;

      .detail-viewer {
        width: 100%;
        padding: 24px;
        min-height: 280px;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 360px;
    padding: 64px 32px;
    background: var(--bg-elevated);
    border-radius: 20px;
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
    text-align: center;
    animation: fadeInUp 0.6s cubic-bezier(0.32, 0.72, 0, 1) 0.3s both;

    .empty-illustration {
      margin-bottom: 28px;

      .empty-icon-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 96px;
        height: 96px;
        background: linear-gradient(
          135deg,
          var(--bg-sunken) 0%,
          var(--border-default) 100%
        );
        border-radius: 50%;
        box-shadow:
          inset 0 2px 4px rgba(255, 255, 255, 0.08),
          0 4px 12px rgba(0, 0, 0, 0.2);

        .empty-icon {
          font-size: 42px;
          color: var(--text-tertiary);
        }
      }
    }

    .empty-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 10px;
      letter-spacing: -0.01em;
    }

    .empty-description {
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 420px;
      margin-bottom: 32px;
    }

    .empty-hints {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;

      .hint-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        background: var(--bg-sunken);
        border: 1px solid var(--border-default);
        border-radius: 10px;
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease,
          transform 0.15s ease;

        &:hover {
          background: var(--interactive-hover);
          border-color: var(--color-primary-border);
          transform: translateY(-1px);
        }

        .hint-icon {
          font-size: 16px;
          color: var(--color-primary);
        }
      }
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .param-extract-page {
    .page-header,
    .bento-item,
    .empty-state,
    .detail-panel {
      animation: none;
      transition: none;
    }

    .hint-item {
      transition:
        background-color 0.1s ease,
        border-color 0.1s ease;
    }
  }
}

@media (max-width: 1024px) {
  .param-extract-page {
    .page-container {
      padding: 40px 24px 56px;
    }

    .page-header {
      margin-bottom: 44px;

      .page-title {
        font-size: clamp(32px, 4vw, 44px);
      }

      .page-subtitle {
        font-size: 16px;
      }
    }

    .bento-grid {
      gap: 20px;

      .bento-input {
        grid-column: span 12;
        grid-row: span 1;
      }

      .bento-stats {
        grid-column: span 12;
      }

      .bento-results {
        grid-column: span 12;
      }
    }
  }
}

@media (max-width: 768px) {
  .param-extract-page {
    .page-container {
      padding: 32px 16px 48px;
    }

    .page-header {
      margin-bottom: 36px;

      .eybow-tag {
        font-size: 10px;
        padding: 5px 14px;
      }

      .page-title {
        font-size: 28px;
        flex-direction: column;
        gap: 12px;

        .title-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;

          .title-icon {
            font-size: 24px;
          }
        }
      }

      .page-subtitle {
        font-size: 15px;
      }
    }

    .bento-grid {
      gap: 16px;
    }

    .empty-state {
      min-height: 280px;
      padding: 40px 20px;

      .empty-illustration {
        .empty-icon-circle {
          width: 80px;
          height: 80px;

          .empty-icon {
            font-size: 36px;
          }
        }
      }

      .empty-title {
        font-size: 19px;
      }

      .empty-description {
        font-size: 14px;
      }

      .empty-hints {
        flex-direction: column;
        gap: 12px;
      }
    }

    .detail-panel {
      min-height: 320px;
      border-radius: 16px;

      .detail-header {
        padding: 16px 20px;
      }

      .detail-content {
        min-height: 280px;

        .detail-viewer {
          padding: 20px 16px;
          min-height: 260px;
        }
      }
    }
  }
}
</style>
