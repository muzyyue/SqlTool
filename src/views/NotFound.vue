<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-icon">
        <FileUnknownOutlined />
      </div>
      <h1 class="error-title">404</h1>
      <p class="error-message">抱歉，您访问的页面不存在</p>
      <div class="error-actions">
        <GradientButton type="primary" size="lg" @click="goHome"> 返回首页 </GradientButton>
        <GradientButton type="secondary" size="lg" @click="goBack"> 返回上页 </GradientButton>
      </div>
      <div class="quick-links">
        <h3>快速链接</h3>
        <div class="links-grid">
          <a @click="goHome">首页</a>
          <a @click="goToTools">工具箱</a>
          <a @click="goToInsert">INSERT 生成</a>
          <a @click="goToUpdate">UPDATE 生成</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { FileUnknownOutlined } from '@ant-design/icons-vue'
import GradientButton from '@/components/common/GradientButton.vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}

const goToTools = () => {
  router.push('/#')
}

const goToInsert = () => {
  router.push('/insert')
}

const goToUpdate = () => {
  router.push('/update')
}
</script>

<style lang="scss" scoped>
// ========================================
// 404 页面样式
// ========================================

.not-found-page {
  min-height: 100vh;
  @include flex-center;
  background: $bg-base;
  padding: 40px 20px;
}

.not-found-content {
  text-align: center;
  max-width: 600px;
}

// 错误图标
.error-icon {
  font-size: 120px;
  color: $text-secondary;
  margin-bottom: 24px;
}

// 错误标题
.error-title {
  font-size: 72px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 16px 0;
  line-height: 1;
}

// 错误消息
.error-message {
  font-size: 20px;
  color: $text-secondary;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

// 操作按钮区域
.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 48px;
}

// 快速链接区域
.quick-links {
  text-align: left;
  background: $bg-elevated;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 20px 0;
  }
}

// 链接网格
.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: $border-radius-sm;
    color: $text-secondary;
    text-decoration: none;
    transition: color 0.3s ease, background-color 0.3s ease, transform 0.3s ease;
    will-change: transform;
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, $color-primary 10%, transparent);
      filter: brightness(0.85);
    }
  }
}

// 响应式设计
@include respond-to(md) {
  .error-icon {
    font-size: 80px;
  }

  .error-title {
    font-size: 48px;
  }

  .error-message {
    font-size: 16px;
  }

  .error-actions {
    flex-direction: column;
  }

  .links-grid {
    grid-template-columns: 1fr;
  }
}
</style>
