<template>
  <div class="sql-detail-viewer">
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="preview" tab="SQL 预览">
        <div class="sql-preview">
          <pre
            class="sql-code"
          ><code>{{ item.original || item.sql || '' }}</code></pre>
        </div>
        <div class="action-bar">
          <a-button size="small" @click="copyOriginal">
            <template #icon><CopyOutlined /></template>
            复制原始SQL
          </a-button>
          <a-button size="small" @click="copyFormatted">
            <template #icon><CopyOutlined /></template>
            复制格式化SQL
          </a-button>
        </div>
      </a-tab-pane>

      <a-tab-pane key="structure" tab="结构化信息">
        <a-table
          :columns="structureColumns"
          :data-source="structureData"
          :pagination="false"
          size="small"
          bordered
        />
      </a-tab-pane>

      <a-tab-pane key="error" tab="错误详情" :disabled="!hasError">
        <a-alert
          v-if="hasError"
          type="error"
          :message="errorMessage"
          show-icon
        />
        <a-empty v-else description="无语法错误" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { CopyOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
});

const activeTab = ref("preview");

const structureColumns = [
  { title: "属性", dataIndex: "label", key: "label", width: 120 },
  { title: "值", dataIndex: "value", key: "value" },
];

const structureData = computed(() => {
  const meta = props.item?.metadata || {};
  const extracted = props.item?.extracted?.[0] || {};
  return [
    { label: "SQL类型", value: meta.sqlType || extracted.dataType || "-" },
    {
      label: "行号范围",
      value:
        meta.lineRange ||
        `${extracted.lineStart || "-"} ~ ${extracted.lineEnd || "-"}`,
    },
    { label: "原始长度", value: (props.item?.original || "").length + " 字符" },
  ];
});

const hasError = computed(() => {
  return props.item?.extracted?.some((e) => e.status === "error");
});

const errorMessage = computed(() => {
  const errorItem = props.item?.extracted?.find((e) => e.status === "error");
  return errorItem?.error || errorItem?.metadata?.errorMessage || "未知错误";
});

async function copyOriginal() {
  try {
    await navigator.clipboard.writeText(props.item.original || "");
    message.success("已复制原始SQL");
  } catch {
    message.error("复制失败");
  }
}

async function copyFormatted() {
  const sql = props.item.original || "";
  const formatted = sql
    .replace(/\s+/g, " ")
    .replace(/\s*;\s*$/, ";")
    .trim();
  try {
    await navigator.clipboard.writeText(formatted);
    message.success("已复制格式化SQL");
  } catch {
    message.error("复制失败");
  }
}
</script>

<style lang="scss" scoped>
.sql-detail-viewer {
  contain: content;

  .sql-preview {
    background: var(--code-bg, #1e1e1e);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
    margin-bottom: 12px;

    .sql-code {
      margin: 0;
      font-family: "Fira Code", "Cascadia Code", Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #d4d4d4;
      white-space: pre-wrap;
      word-break: break-all;

      // SQL 关键字高亮（简化版）
      :deep(code) {
        .keyword {
          color: #569cd6;
        }
        .string {
          color: #ce9178;
        }
        .number {
          color: #b5cea8;
        }
        .comment {
          color: #6a9955;
        }
      }
    }
  }

  .action-bar {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  :deep(.ant-tabs-content) {
    padding-top: 16px;
  }
}
</style>
