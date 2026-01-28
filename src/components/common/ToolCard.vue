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
.tool-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tool-card:hover {
  border-color: #1890ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.15);
}

.tool-card-favorite {
  border-color: #faad14;
}

.tool-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.tool-icon {
  font-size: 32px;
  color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: #e6f7ff;
  border-radius: 12px;
}

.favorite-button {
  color: #d9d9d9;
  padding: 4px;
}

.favorite-button:hover {
  color: #faad14;
}

.star-filled {
  color: #faad14;
}

.star-outlined {
  color: #d9d9d9;
}

.tool-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tool-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.tool-description {
  font-size: 14px;
  color: #666;
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
  border-top: 1px solid #f0f0f0;
}

/* 暗色主题支持 */
[data-theme='dark'] .tool-card {
  background: #1f2937;
  border-color: #374151;
}

[data-theme='dark'] .tool-card:hover {
  border-color: #60a5fa;
  box-shadow: 0 8px 24px rgba(96, 165, 250, 0.15);
}

[data-theme='dark'] .tool-card-favorite {
  border-color: #f59e0b;
}

[data-theme='dark'] .tool-icon {
  background: #1e40af;
  color: #60a5fa;
}

[data-theme='dark'] .tool-name {
  color: #f3f4f6;
}

[data-theme='dark'] .tool-description {
  color: #9ca3af;
}

[data-theme='dark'] .tool-card-footer {
  border-top-color: #374151;
}

[data-theme='dark'] .favorite-button {
  color: #6b7280;
}

[data-theme='dark'] .star-filled {
  color: #f59e0b;
}
</style>
