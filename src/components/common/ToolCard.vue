<template>
  <div class="tool-card" :class="{ 'tool-card-favorite': isFavorited }" @click="handleClick">
    <div class="tool-card-header">
      <div class="tool-icon">
        <component :is="iconComponent" />
      </div>
      <a-button type="text" class="favorite-button" @click.stop="toggleFavorite">
        <StarFilled v-if="isFavorited" class="star-filled" />
        <StarOutlined v-else class="star-outlined" />
      </a-button>
    </div>

    <div class="tool-card-body">
      <h3 class="tool-name">{{ props.tool?.name }}</h3>
      <p class="tool-description">{{ props.tool?.description }}</p>
      <div class="tool-tags" v-if="props.tool?.tags">
        <a-tag
          v-for="tag in (props.tool.tags || []).slice(0, 3)"
          :key="tag"
          size="small"
          color="blue"
        >
          {{ tag }}
        </a-tag>
      </div>
    </div>

    <div class="tool-card-footer">
      <a-button type="link" size="small" @click.stop="handleClick">
        立即使用 <RightOutlined />
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  StarOutlined,
  StarFilled,
  RightOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  LockOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  QrcodeOutlined,
  BgColorsOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { useFavorites } from '@/composables/useFavorites.js'

const props = defineProps({
  /** 工具对象 */
  tool: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['click'])

const router = useRouter()
const { isFavorite, toggleFavorite } = useFavorites()

/**
 * 图标组件映射
 */
const iconMap = {
  CodeOutlined: CodeOutlined,
  DatabaseOutlined: DatabaseOutlined,
  ClockCircleOutlined: ClockCircleOutlined,
  LockOutlined: LockOutlined,
  LinkOutlined: LinkOutlined,
  SafetyCertificateOutlined: SafetyCertificateOutlined,
  KeyOutlined: KeyOutlined,
  QrcodeOutlined: QrcodeOutlined,
  BgColorsOutlined: BgColorsOutlined,
  SearchOutlined: SearchOutlined,
}

/**
 * 图标组件
 */
const iconComponent = computed(() => {
  const iconName = props.tool?.icon
  return iconMap[iconName] || CodeOutlined
})

/**
 * 是否已收藏
 */
const isFavorited = computed(() => {
  return props.tool && isFavorite(props.tool)
})

/**
 * 处理点击事件
 */
const handleClick = () => {
  if (!props.tool) return
  emit('click', props.tool)
  router.push(props.tool.route)
}
</script>

<style scoped>
/**
 * 工具卡片
 * 使用 CSS 变量实现主题切换
 */
.tool-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--border-radius-md);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-slow) ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tool-card:hover {
  border-color: var(--card-hover-border);
  transform: translateY(-4px);
  box-shadow: var(--card-hover-shadow);
}

.tool-card-favorite {
  border-color: var(--color-warning);
}

.tool-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.tool-icon {
  font-size: 32px;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--color-primary-bg);
  border-radius: var(--border-radius-md);
}

.favorite-button {
  color: var(--text-disabled);
  padding: 4px;
}

.favorite-button:hover {
  color: var(--color-warning);
}

.star-filled {
  color: var(--color-warning);
}

.star-outlined {
  color: var(--text-disabled);
}

.tool-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tool-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.tool-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 12px 0;
  flex: 1;
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.tool-card-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tool-card {
    padding: 16px;
  }

  .tool-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .tool-name {
    font-size: 16px;
  }

  .tool-description {
    font-size: 13px;
  }
}
</style>
