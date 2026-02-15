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

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: 40px 20px;
}

.not-found-content {
  text-align: center;
  max-width: 600px;
}

.error-icon {
  font-size: 120px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.error-title {
  font-size: 72px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  line-height: 1;
}

.error-message {
  font-size: 20px;
  color: var(--text-secondary);
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 48px;
}

.quick-links {
  text-align: left;
  background: var(--bg-elevated);
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.quick-links h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.links-grid a {
  color: var(--color-primary);
  text-decoration: none;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.links-grid a:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  filter: brightness(0.85);
}

/* 响应式设计 */
@media (max-width: 768px) {
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
