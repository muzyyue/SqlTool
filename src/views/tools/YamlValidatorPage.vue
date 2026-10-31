<template>
  <div class="yaml-validator-page">
    <div class="page-stack">
      <!-- 页头卡片 -->
      <VbenGlassCard :hoverable="false" class="header-card">
        <div class="page-header">
          <div>
            <h1 class="page-title">YAML 校验</h1>
            <p class="page-subtitle">
              定位不可见字符与全角标点，并做 Docker Compose 专项检查
            </p>
          </div>
          <div class="header-actions">
            <GradientButton type="secondary" size="md" @click="loadSample">
              示例
            </GradientButton>
            <GradientButton type="secondary" size="md" @click="clearAll">
              清空
            </GradientButton>
            <GradientButton type="primary" size="md" @click="handleValidate">
              校验
            </GradientButton>
          </div>
        </div>
      </VbenGlassCard>

      <!-- 输入与选项 -->
      <div class="content-layout">
        <VbenGlassCard
          :hoverable="false"
          title="YAML 内容"
          description="直接粘贴，或拖拽 / 选择 .yaml / .yml 文件（本地解析，不上传）"
        >
          <a-upload-dragger
            :show-upload-list="false"
            :before-upload="handleFileRead"
            accept=".yaml,.yml,text/plain"
            :max-count="1"
          >
            <p class="ant-upload-drag-icon"><InboxOutlined /></p>
            <p class="ant-upload-text">点击或拖拽 YAML 文件到此区域</p>
            <p class="ant-upload-hint">
              限制 {{ MAX_FILE_MB }} MB，超出请改用命令行处理
            </p>
          </a-upload-dragger>

          <a-textarea
            v-model:value="inputText"
            class="yaml-textarea"
            :auto-size="{ minRows: 12, maxRows: 24 }"
            placeholder="services:&#10;  web:&#10;    image: nginx:1.27"
            spellcheck="false"
          />
          <div class="input-meta">
            <span>{{ inputSizeText }}</span>
            <span v-if="fileName">来源文件：{{ fileName }}</span>
          </div>
        </VbenGlassCard>

        <VbenGlassCard
          :hoverable="false"
          title="校验选项"
          description="扫描范围与专项规则"
        >
          <div class="options-grid">
            <div class="option-row">
              <label>视为问题：Tab 缩进</label>
              <a-switch v-model:checked="options.includeTab" />
            </div>

            <div class="option-row">
              <label>启用 Docker Compose 检查</label>
              <a-switch v-model:checked="options.compose" />
            </div>

            <div class="option-row option-col">
              <label>修复时的 Tab 缩进宽度</label>
              <a-input-number
                v-model:value="options.indentWidth"
                :min="1"
                :max="8"
                style="width: 120px"
              />
            </div>

            <div class="option-row">
              <label>保留文件开头 BOM</label>
              <a-switch v-model:checked="options.keepBom" />
            </div>
          </div>

          <div class="supported-formats">
            <div class="formats-title">能定位的问题</div>
            <ul>
              <li><code>NBSP U+00A0</code>、各类 Unicode 空格、全角空格</li>
              <li><code>ZWSP U+200B</code>、ZWNJ / ZWJ、BOM</li>
              <li>全角冒号<code>：</code>、逗号、括号、引号</li>
              <li><code>U+2028 / U+2029</code> 行与段分隔符</li>
              <li>Tab 缩进，以及 Compose 的 image / volumes / depends_on / ports</li>
            </ul>
          </div>
        </VbenGlassCard>
      </div>

      <!-- 结果区 -->
      <template v-if="hasResult">
        <VbenGlassCard :hoverable="false" title="校验结果">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-value">{{ result.lineCount }}</span>
              <span class="summary-label">总行数</span>
            </div>
            <div class="summary-item summary-error">
              <span class="summary-value">{{ result.errorCount }}</span>
              <span class="summary-label">错误</span>
            </div>
            <div class="summary-item summary-warning">
              <span class="summary-value">{{ result.warningCount }}</span>
              <span class="summary-label">警告</span>
            </div>
            <div class="summary-item">
              <span class="summary-value">{{ result.invisibleTotal }}</span>
              <span class="summary-label">不可见字符</span>
            </div>
          </div>

          <div class="result-verdict" :class="result.ok ? 'is-ok' : 'is-bad'">
            <CheckCircleOutlined v-if="result.ok" />
            <CloseCircleOutlined v-else />
            <span>{{ verdictText }}</span>
          </div>

          <div v-if="hasIssues" class="result-actions">
            <GradientButton
              type="primary"
              size="md"
              :disabled="!result.invisibleTotal"
              @click="handleFix"
            >
              一键修复并复制
            </GradientButton>
            <GradientButton type="secondary" size="md" @click="copySource">
              复制原文
            </GradientButton>
          </div>
          <div v-if="fixInfo" class="fix-info">{{ fixInfo }}</div>
        </VbenGlassCard>

        <!-- 不可见字符 -->
        <VbenGlassCard
          v-if="result.invisible.length"
          :hoverable="false"
          :title="`不可见字符（${result.invisibleTotal} 处）`"
          :description="
            result.invisibleTruncated
              ? `结果已截断，仅显示前 ${result.invisible.length} 处`
              : '按行号排列，context 中用 ⟦U+XXXX⟧ 标出确切位置'
          "
        >
          <div class="issue-list">
            <div
              v-for="(item, index) in result.invisible"
              :key="`inv-${index}-${item.line}-${item.column}`"
              class="issue-item"
            >
              <div class="issue-head">
                <a-tag :color="item.severity === 'error' ? 'red' : 'orange'">
                  {{ item.severity === "error" ? "错误" : "警告" }}
                </a-tag>
                <span class="issue-pos">
                  第 {{ item.line }} 行，第 {{ item.column }} 列
                </span>
                <code class="issue-code">{{ item.codeHex }}</code>
                <span class="issue-name">{{ item.name }}</span>
              </div>
              <div class="issue-context">{{ item.context || "（行内容为空）" }}</div>
              <div class="issue-reason">{{ item.reason }}</div>
              <div class="issue-fix">建议：{{ item.fix }}</div>
            </div>
          </div>
        </VbenGlassCard>

        <!-- 解析错误与警告 -->
        <VbenGlassCard
          v-if="result.parseErrors.length || result.parseWarnings.length"
          :hoverable="false"
          title="语法解析"
        >
          <div class="issue-list">
            <div
              v-for="(item, index) in [...result.parseErrors, ...result.parseWarnings]"
              :key="`parse-${index}`"
              class="issue-item"
            >
              <div class="issue-head">
                <a-tag :color="index < result.parseErrors.length ? 'red' : 'orange'">
                  {{ index < result.parseErrors.length ? "错误" : "警告" }}
                </a-tag>
                <span class="issue-pos">
                  {{
                    item.line
                      ? `第 ${item.line} 行，第 ${item.column} 列`
                      : "位置未知"
                  }}
                </span>
              </div>
              <div class="issue-context">{{ item.message }}</div>
            </div>
          </div>
        </VbenGlassCard>

        <!-- Compose 专项 -->
        <VbenGlassCard
          v-if="options.compose"
          :hoverable="false"
          :title="`Docker Compose 检查（${result.composeIssues.length} 条）`"
        >
          <div v-if="!result.composeIssues.length" class="empty-result">
            <CheckCircleOutlined class="empty-icon" />
            <span>未发现 Compose 配置问题</span>
          </div>
          <div v-else class="issue-list">
            <div
              v-for="(item, index) in result.composeIssues"
              :key="`compose-${index}`"
              class="issue-item"
            >
              <div class="issue-head">
                <a-tag :color="item.severity === 'error' ? 'red' : 'orange'">
                  {{ item.severity === "error" ? "错误" : "警告" }}
                </a-tag>
                <code class="issue-code">{{ item.path }}</code>
              </div>
              <div class="issue-context">{{ item.message }}</div>
              <div class="issue-fix">建议：{{ item.hint }}</div>
            </div>
          </div>
        </VbenGlassCard>

        <!-- 解析后的结构摘要 -->
        <VbenGlassCard
          v-if="result.data"
          :hoverable="false"
          title="结构摘要"
          description="解析成功后的顶层结构，便于快速确认层级是否符合预期"
        >
          <pre class="data-preview">{{ dataPreview }}</pre>
        </VbenGlassCard>
      </template>

      <!-- 空状态 -->
      <VbenGlassCard
        v-if="!hasResult"
        :hoverable="false"
        class="empty-card"
      >
        <div class="empty-state">
          <FileSearchOutlined class="empty-state-icon" />
          <h3>等待 YAML 内容</h3>
          <p>粘贴 Compose 配置或上传文件，点击「校验」定位不可见字符</p>
        </div>
      </VbenGlassCard>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import {
  InboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileSearchOutlined,
} from "@ant-design/icons-vue";
import VbenGlassCard from "@/components/common/VbenGlassCard.vue";
import GradientButton from "@/components/common/GradientButton.vue";
import { validateYaml, fixRiskyChars } from "@/utils/yaml/yamlValidator";

const MAX_FILE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024;

const SAMPLE = [
  "services:",
  "  web:",
  "    image: nginx",
  "    ports:",
  '      - "8080:80"',
  "    volumes:",
  "      - ./conf:/etc/nginx/conf.d",
  "    depends_on:",
  "      - db",
  "  db:",
  "    image: postgres:16",
  "",
].join("\n");

const inputText = ref("");
const fileName = ref("");
const hasResult = ref(false);
const fixInfo = ref("");

const options = reactive({
  includeTab: true,
  compose: true,
  indentWidth: 2,
  keepBom: false,
});

const result = reactive({
  ok: true,
  lineCount: 0,
  errorCount: 0,
  warningCount: 0,
  invisible: [],
  parseErrors: [],
  parseWarnings: [],
  composeIssues: [],
  invisibleTotal: 0,
  invisibleTruncated: false,
  data: null,
});

const inputSizeText = computed(() => {
  const kb = new Blob([inputText.value || ""]).size / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
});

const hasIssues = computed(
  () =>
    result.invisible.length > 0 ||
    result.parseErrors.length > 0 ||
    result.composeIssues.length > 0,
);

const verdictText = computed(() => {
  if (result.errorCount > 0) {
    return `发现 ${result.errorCount} 个错误，${result.warningCount} 个警告`;
  }
  if (result.warningCount > 0) {
    return `语法通过，但有 ${result.warningCount} 个警告`;
  }
  return "校验通过，未发现问题";
});

const dataPreview = computed(() => {
  if (!result.data) return "";
  const text = JSON.stringify(result.data, null, 2);
  // 结构过大时只展示开头，避免撑爆页面
  return text.length > 2400 ? `${text.slice(0, 2400)}\n…（已截断）` : text;
});

const handleFileRead = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    message.error(`文件超过 ${MAX_FILE_MB}MB 限制`);
    return false;
  }
  const reader = new FileReader();
  reader.onload = () => {
    inputText.value = String(reader.result || "");
    fileName.value = file.name;
    message.success(`已读取 ${file.name}`);
  };
  reader.onerror = () => message.error("读取文件失败");
  reader.readAsText(file, "utf-8");
  return false;
};

function handleValidate() {
  const source = inputText.value;
  if (!source.trim()) {
    message.warning("请先输入或上传 YAML 内容");
    return;
  }

  const res = validateYaml(source, {
    compose: options.compose,
    includeTab: options.includeTab,
  });

  Object.assign(result, res);
  hasResult.value = true;
  fixInfo.value = "";

  if (res.ok) message.success(verdictText.value);
  else message.error(verdictText.value);
}

async function handleFix() {
  const { text, changed } = fixRiskyChars(inputText.value, {
    indentWidth: options.indentWidth,
    stripBom: !options.keepBom,
  });

  if (!changed) {
    message.info("没有需要修复的字符");
    return;
  }

  inputText.value = text;
  fixInfo.value = `已修复 ${changed} 处字符，文本已替换到编辑器。请重新点「校验」确认。`;

  try {
    await navigator.clipboard.writeText(text);
    message.success(`已修复 ${changed} 处并复制到剪贴板`);
  } catch {
    message.success(`已修复 ${changed} 处，自动复制失败请手动复制`);
  }

  // 修复后立即重新校验，让用户看到结果变化
  handleValidate();
}

async function copySource() {
  try {
    await navigator.clipboard.writeText(inputText.value);
    message.success("原文已复制");
  } catch {
    message.error("复制失败，请手动选择复制");
  }
}

function loadSample() {
  inputText.value = SAMPLE;
  fileName.value = "";
  hasResult.value = false;
  fixInfo.value = "";
  message.success("已载入示例 Compose 配置");
}

function clearAll() {
  inputText.value = "";
  fileName.value = "";
  hasResult.value = false;
  fixInfo.value = "";
  Object.assign(result, {
    ok: true,
    lineCount: 0,
    errorCount: 0,
    warningCount: 0,
    invisible: [],
    parseErrors: [],
    parseWarnings: [],
    composeIssues: [],
    invisibleTotal: 0,
    invisibleTruncated: false,
    data: null,
  });
  message.success("已清空");
}
</script>

<style lang="scss" scoped>
@use "@/design/scss/variables" as *;
@use "@/design/scss/mixins" as *;

.yaml-validator-page {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
  contain: layout style;
}

/* 所有卡片统一取消 hover 上浮效果 */
.page-stack :deep(.vben-glass-card) {
  transition: none !important;
  will-change: auto !important;
}

.page-stack :deep(.vben-glass-card:hover) {
  transform: translateZ(0) !important;
  box-shadow: var(--shadow-lg) !important;
}

.page-stack {
  @include flex-column;
  gap: 24px;
}

.page-header {
  @include flex-between;
  gap: 16px;

  .page-title {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
  }

  .page-subtitle {
    margin: 6px 0 0;
    color: $text-secondary;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.content-layout {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 24px;
  align-items: start;
}

.yaml-textarea {
  margin-top: 16px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
}

.input-meta {
  @include flex-between;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: $text-secondary;
}

.options-grid {
  @include flex-column;
  gap: 16px;
}

.option-row {
  @include flex-between;
  gap: 12px;

  label {
    color: $text-secondary;
  }
}

.option-col {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.supported-formats {
  margin-top: 20px;
  padding-top: 16px;
  @include divider-top;

  .formats-title {
    font-weight: 500;
    margin-bottom: 8px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: $text-secondary;
  }

  code {
    font-family: "Consolas", "Monaco", "Courier New", monospace;
    font-size: 11px;
    background: var(--bg-sunken);
    color: var(--text-primary);
    padding: 1px 6px;
    border-radius: 4px;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.summary-item {
  @include flex-column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 10px;
  background: var(--bg-sunken);

  .summary-value {
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .summary-label {
    font-size: 12px;
    color: $text-secondary;
  }
}

.summary-error .summary-value {
  color: var(--color-error);
}

.summary-warning .summary-value {
  color: var(--color-warning);
}

.result-verdict {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;

  &.is-ok {
    color: var(--color-success);
    background: var(--color-success-bg);
  }

  &.is-bad {
    color: var(--color-error);
    background: var(--color-error-bg);
  }
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.fix-info {
  margin-top: 12px;
  font-size: 12px;
  color: $text-secondary;
}

.issue-list {
  @include flex-column;
  gap: 12px;
  max-height: 560px;
  overflow-y: auto;
  @include custom-scrollbar;
}

.issue-item {
  padding: 12px 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-sunken);
}

.issue-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
}

.issue-pos {
  color: $text-secondary;
  font-variant-numeric: tabular-nums;
}

.issue-code {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--card-bg);
  color: $color-primary;
}

.issue-name {
  font-weight: 500;
}

.issue-context {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--card-bg);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.issue-reason {
  margin-top: 8px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.6;
}

.issue-fix {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-warning);
}

.empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 0;
  color: var(--color-success);
  font-size: 15px;
}

.data-preview {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-sunken);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 420px;
  overflow: auto;
  @include custom-scrollbar;
}

.empty-state {
  @include flex-column-center;
  gap: 12px;
  padding: 32px 20px;
  color: $text-secondary;

  .empty-state-icon {
    font-size: 40px;
    color: var(--color-primary);
  }

  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary);
  }
}

@media (max-width: 960px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
