<template>
  <div class="extract-stats-bar">
    <!-- 统计药丸标签（配置驱动渲染） -->
    <div
      v-for="item in pillItems"
      :key="item.key"
      class="stat-pill"
      :class="[`stat-pill--${item.key}`]"
      @click="handleFilter(item.key)"
    >
      <component :is="item.icon" class="stat-icon" />
      <span class="stat-label">{{ item.label }}</span>
      <span class="stat-value">{{ stats[item.valueKey] }}</span>
    </div>

    <!-- 成功率区域 -->
    <div class="rate-section">
      <span class="rate-label">成功率</span>
      <a-tooltip :title="`${successRate}% (${stats.success}/${stats.total})`">
        <div class="progress-wrapper">
          <div class="progress-track">
            <div
              class="progress-fill"
              :class="progressClass"
              :style="{ width: `${successRate}%` }"
            />
          </div>
        </div>
      </a-tooltip>
      <span class="rate-value" :class="rateClass">{{ successRate }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  DatabaseOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons-vue";

/** 筛选类型 */
type FilterKey = "total" | "sql" | "success" | "warning" | "error";

/** 统计数据接口 */
interface Stats {
  total: number;
  sqlCount: number;
  success: number;
  warning: number;
  error: number;
}

interface Props {
  stats: Stats;
}

const props = defineProps<Props>();

const emit = defineEmits<{ filter: [key: FilterKey] }>();

/**
 * 药丸标签配置项
 * 驱动渲染的声明式配置，遵循 DRY 原则
 * 每项包含：唯一标识、显示标签、图标组件、对应 stats 字段
 */
interface PillItem {
  key: FilterKey;
  label: string;
  icon: ReturnType<typeof DatabaseOutlined>;
  valueKey: keyof Stats;
}

/** 药丸标签配置数组 */
const pillItems: PillItem[] = [
  { key: "total", label: "总数", icon: DatabaseOutlined, valueKey: "total" },
  { key: "sql", label: "SQL", icon: CodeOutlined, valueKey: "sqlCount" },
  {
    key: "success",
    label: "成功",
    icon: CheckCircleOutlined,
    valueKey: "success",
  },
  { key: "warning", label: "警告", icon: WarningOutlined, valueKey: "warning" },
  { key: "error", label: "错误", icon: CloseCircleOutlined, valueKey: "error" },
];

/** 成功率百分比（除零保护） */
const successRate = computed(() => {
  if (props.stats.total === 0) return 0;
  return Math.round((props.stats.success / props.stats.total) * 100);
});

/**
 * 进度条状态类名
 * 根据成功率区间返回对应的 CSS 类（支持深色模式适配）
 */
const progressClass = computed(() => {
  if (successRate.value >= 90) return "progress-fill--excellent";
  if (successRate.value >= 70) return "progress-fill--good";
  return "progress-fill--poor";
});

/** 成功率数值CSS类 */
const rateClass = computed(() => {
  if (successRate.value >= 90) return "rate-excellent";
  if (successRate.value >= 70) return "rate-good";
  return "rate-poor";
});

/** 点击统计项触发筛选 */
const handleFilter = (key: FilterKey) => emit("filter", key);
</script>

<style scoped lang="scss">
/* ============================================
   ExtractStatsBar - 高端视觉设计规范
   Pill-shaped 标签 + 自定义渐变进度条
   ============================================ */

.extract-stats-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background: $bg-elevated;
  border: 1px solid $border-default;
  border-radius: $border-radius-md;
}

/* ============================================
   药丸标签 (Stat Pill)
   圆角胶囊形状 + 颜色编码 + 微交互
   ============================================ */
.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition:
    transform 200ms cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 200ms cubic-bezier(0.32, 0.72, 0, 1),
    background-color 200ms cubic-bezier(0.32, 0.72, 0, 1),
    color 200ms cubic-bezier(0.32, 0.72, 0, 1);

  /* 图标 */
  .stat-icon {
    font-size: 14px;
    opacity: 0.85;
    transition: opacity 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* 标签文字 */
  .stat-label {
    opacity: 0.9;
  }

  /* 数字 - 等宽字体特性 */
  .stat-value {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
    min-width: 1.5em;
    text-align: right;
    transition: color 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Hover: 轻微上浮 + 阴影加深 */
  &:hover {
    transform: translateY(-2px);

    .stat-icon {
      opacity: 1;
    }
  }

  /* Active: 按压缩放 */
  &:active {
    transform: scale(0.98);
  }
}

/* ------------------------------------------
   颜色编码 - 6 种语义化状态色
   每种颜色: 半透明背景 + 实心前景 + 匹配阴影
   ------------------------------------------ */

/* 总数 - 灰色 */
.stat-pill--total {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;

  &:hover {
    box-shadow: 0 4px 12px rgba(100, 116, 139, 0.2);
    background: rgba(100, 116, 139, 0.15);
  }
}

/* SQL - 蓝色 */
.stat-pill--sql {
  background: rgba(22, 119, 255, 0.1);
  color: #1677ff;

  &:hover {
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.25);
    background: rgba(22, 119, 255, 0.15);
  }
}

/* 成功 - 绿色 */
.stat-pill--success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;

  &:hover {
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    background: rgba(16, 185, 129, 0.15);
  }
}

/* 警告 - 橙色 */
.stat-pill--warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;

  &:hover {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
    background: rgba(245, 158, 11, 0.15);
  }
}

/* 错误 - 红色 */
.stat-pill--error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;

  &:hover {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    background: rgba(239, 68, 68, 0.15);
  }
}

/* ============================================
   成功率区域 (Rate Section)
   自定义进度条 + 渐变填充
   ============================================ */
.rate-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 4px;
  padding-left: 12px;
  border-left: 1px solid $border-light;
}

.rate-label {
  font-size: 12px;
  color: $text-secondary;
  white-space: nowrap;
}

/* 进度条容器 */
.progress-wrapper {
  position: relative;
  width: 100px;
  height: 6px;
  cursor: default;
}

/* 进度条轨道 */
.progress-track {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  background: $bg-sunken;
  overflow: hidden;
}

/* 进度条填充 - 渐变色 + 平滑过渡 */
.progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition:
    width 600ms cubic-bezier(0.32, 0.72, 0, 1),
    background 400ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: width;
}

/* 成功率数值 */
.rate-value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  min-width: 40px;
  text-align: right;
  transition: color 300ms cubic-bezier(0.32, 0.72, 0, 1);
}

.rate-excellent {
  color: #10b981;
}
.rate-good {
  color: #f59e0b;
}
.rate-poor {
  color: #ef4444;
}

/* ============================================
   响应式 (< 768px)
   单列布局 + 居中对齐
   ============================================ */
@media (max-width: 768px) {
  .extract-stats-bar {
    flex-direction: column;
    align-items: center;
    padding: 12px;
    gap: 8px;
  }

  .stat-pill {
    width: 100%;
    justify-content: center;
  }

  .rate-section {
    width: 100%;
    margin-left: 0;
    padding-left: 0;
    padding-top: 8px;
    border-left: none;
    border-top: 1px solid $border-light;
    justify-content: space-between;
  }

  .progress-wrapper {
    flex: 1;
    max-width: 120px;
  }
}

/* ============================================
   进度条填充 - 浅色模式渐变色（3 种状态）
   ============================================ */
.progress-fill--excellent {
  background: linear-gradient(90deg, #10b981, #34d399);
}
.progress-fill--good {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
.progress-fill--poor {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

/* ============================================
   深色模式完整适配 [data-theme="dark"]
   Pill 标签 + 进度条 + 成功率数值
   符合 WCAG AA 对比度标准
   ============================================ */
[data-theme="dark"] {
  /* ------------------------------------------
     Pill 标签 - 深色模式颜色系统
     使用更高亮度的颜色以确保可读性
     ------------------------------------------ */

  /* 总数 - 灰色调亮 */
  .stat-pill--total {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;

    &:hover {
      box-shadow: 0 4px 12px rgba(148, 163, 184, 0.25);
      background: rgba(148, 163, 184, 0.22);
    }
  }

  /* SQL - 蓝色调亮 */
  .stat-pill--sql {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;

    &:hover {
      box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
      background: rgba(96, 165, 250, 0.28);
    }
  }

  /* 成功 - 绿色调亮 */
  .stat-pill--success {
    background: rgba(110, 231, 183, 0.15);
    color: #6ee7b7;

    &:hover {
      box-shadow: 0 4px 12px rgba(110, 231, 183, 0.25);
      background: rgba(110, 231, 183, 0.22);
    }
  }

  /* 警告 - 橙黄色调亮 */
  .stat-pill--warning {
    background: rgba(252, 211, 77, 0.15);
    color: #fcd34d;

    &:hover {
      box-shadow: 0 4px 12px rgba(252, 211, 77, 0.25);
      background: rgba(252, 211, 77, 0.22);
    }
  }

  /* 错误 - 红色调亮 */
  .stat-pill--error {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;

    &:hover {
      box-shadow: 0 4px 12px rgba(248, 113, 113, 0.25);
      background: rgba(248, 113, 113, 0.22);
    }
  }

  /* ------------------------------------------
     进度条 - 深色模式渐变色
     使用更柔和的渐变以适应暗色背景
     ------------------------------------------ */
  .progress-fill--excellent {
    background: linear-gradient(90deg, #059669, #10b981);
  }
  .progress-fill--good {
    background: linear-gradient(90deg, #d97706, #f59e0b);
  }
  .progress-fill--poor {
    background: linear-gradient(90deg, #dc2626, #ef4444);
  }

  /* ------------------------------------------
     成功率数值 - 深色模式颜色
     ------------------------------------------ */
  .rate-excellent {
    color: #6ee7b7;
  }
  .rate-good {
    color: #fcd34d;
  }
  .rate-poor {
    color: #f87171;
  }
}
</style>
