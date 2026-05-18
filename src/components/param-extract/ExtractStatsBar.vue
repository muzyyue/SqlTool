<template>
  <div class="extract-stats-bar">
    <!-- 数量统计 -->
    <div class="stats-group">
      <a-tag clickable @click="handleFilter('total')"
        ><DatabaseOutlined /> 总数: {{ stats.total }}</a-tag
      >
      <a-tag color="blue" clickable @click="handleFilter('sql')"
        ><CodeOutlined /> SQL: {{ stats.sqlCount }}</a-tag
      >
      <a-tag color="purple" clickable @click="handleFilter('json')"
        ><ApartmentOutlined /> JSON: {{ stats.jsonCount }}</a-tag
      >
    </div>

    <a-divider type="vertical" class="stats-divider" />

    <!-- 状态统计（语义化颜色） -->
    <div class="stats-group">
      <a-tag color="success" clickable @click="handleFilter('success')"
        ><CheckCircleOutlined /> 成功: {{ stats.success }}</a-tag
      >
      <a-tag color="warning" clickable @click="handleFilter('warning')"
        ><WarningOutlined /> 警告: {{ stats.warning }}</a-tag
      >
      <a-tag color="error" clickable @click="handleFilter('error')"
        ><CloseCircleOutlined /> 错误: {{ stats.error }}</a-tag
      >
    </div>

    <a-divider type="vertical" class="stats-divider" />

    <!-- 成功率进度条 -->
    <div class="stats-rate">
      <span class="rate-label">成功率</span>
      <a-tooltip :title="`${successRate}% (${stats.success}/${stats.total})`">
        <a-progress
          :percent="successRate"
          :stroke-color="progressColor"
          :show-info="false"
          size="small"
          class="rate-progress"
        />
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
  ApartmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons-vue";

/** 筛选类型 */
type FilterKey = "total" | "sql" | "json" | "success" | "warning" | "error";

/** 统计数据接口 */
interface Stats {
  total: number;
  sqlCount: number;
  jsonCount: number;
  success: number;
  warning: number;
  error: number;
}

interface Props {
  stats: Stats;
}

const props = defineProps<Props>();

const emit = defineEmits<{ filter: [key: FilterKey] }>();

/** 成功率百分比（除零保护） */
const successRate = computed(() => {
  if (props.stats.total === 0) return 0;
  return Math.round((props.stats.success / props.stats.total) * 100);
});

/** 进度条颜色：>=90绿 >=70橙 <70红 */
const progressColor = computed(() => {
  if (successRate.value >= 90) return "#52c41a";
  if (successRate.value >= 70) return "#faad14";
  return "#ff4d4f";
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
.extract-stats-bar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: $bg-elevated;
  border: 1px solid $border-default;
  border-radius: $border-radius-md;
  gap: 12px;
  flex-wrap: wrap;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stats-divider {
  height: 24px;
  margin: 0 !important;
  border-color: $border-light;
}

/* Tag交互样式 */
:deep(.ant-tag) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all $transition-fast;
  font-size: 13px;
  padding: 2px 8px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: $shadow-sm;
  }
  &:active {
    transform: scale(0.98);
  }
}

/* 成功率区域 */
.stats-rate {
  display: flex;
  align-items: center;
  min-width: 180px;
}

.rate-label {
  font-size: 12px;
  color: $text-secondary;
  white-space: nowrap;
  margin-right: 4px;
}

.rate-progress {
  width: 100px;
  flex-shrink: 0;

  :deep(.ant-progress-inner) {
    background: $bg-sunken;
  }
}

.rate-value {
  font-size: 13px;
  font-weight: 600;
  margin-left: 6px;
  min-width: 40px;
  text-align: right;
}

.rate-excellent {
  color: $color-success;
}
.rate-good {
  color: $color-warning;
}
.rate-poor {
  color: $color-error;
}

@media (max-width: 768px) {
  .extract-stats-bar {
    flex-direction: column;
    padding: 8px 12px;
    gap: 8px;
  }
  .stats-group {
    justify-content: center;
  }
  .stats-divider {
    display: none;
  }
  .stats-rate {
    min-width: unset;
    justify-content: space-between;
  }
  .rate-progress {
    width: 80px;
  }
}
</style>
