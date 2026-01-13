<template>
  <div class="sql-tool-page">
    <div class="page-header">
      <h1 class="page-title">SQL 生成工具</h1>
      <p class="page-subtitle">基于 Excel 数据快速生成 SQL 语句，支持多种数据库</p>
    </div>

    <div class="feature-section">
      <VbenGlassCard title="功能特性" class="feature-card">
        <div class="feature-list">
          <div class="feature-item">
            <DatabaseOutlined class="feature-icon" />
            <div class="feature-content">
              <h3>多数据库支持</h3>
              <p>支持 MySQL、PostgreSQL、Oracle、SQL Server、达梦数据库</p>
            </div>
          </div>
          <div class="feature-item">
            <FileExcelOutlined class="feature-icon" />
            <div class="feature-content">
              <h3>Excel 导入</h3>
              <p>支持 .xlsx、.xls 格式，自动识别表头和数据</p>
            </div>
          </div>
          <div class="feature-item">
            <CodeOutlined class="feature-icon" />
            <div class="feature-content">
              <h3>智能字段映射</h3>
              <p>自动匹配 Excel 列与数据库字段，支持自定义绑定</p>
            </div>
          </div>
          <div class="feature-item">
            <ThunderboltOutlined class="feature-icon" />
            <div class="feature-content">
              <h3>快速生成</h3>
              <p>一键生成 INSERT、UPDATE、DDL 语句，提高开发效率</p>
            </div>
          </div>
        </div>
      </VbenGlassCard>
    </div>

    <div class="tools-section">
      <h2 class="section-title">可用工具</h2>
      <div class="tools-grid">
        <VbenGlassCard
          title="INSERT 语句生成"
          description="根据 Excel 数据和 DDL 语句生成 INSERT 语句"
          hoverable
          @click="navigateTo('/insert')"
        >
          <template #icon>
            <InsertRowAboveOutlined class="card-icon" />
          </template>
          <template #extra>
            <a-button type="primary" size="small">
              开始使用 <RightOutlined />
            </a-button>
          </template>
        </VbenGlassCard>

        <VbenGlassCard
          title="UPDATE 语句生成"
          description="根据 Excel 数据和 DDL 语句生成 UPDATE 语句"
          hoverable
          @click="navigateTo('/update')"
        >
          <template #icon>
            <EditOutlined class="card-icon" />
          </template>
          <template #extra>
            <a-button type="primary" size="small">
              开始使用 <RightOutlined />
            </a-button>
          </template>
        </VbenGlassCard>

        <VbenGlassCard
          title="DDL 语句生成"
          description="根据 Excel 数据生成 DDL 语句"
          hoverable
          @click="navigateTo('/ddl')"
        >
          <template #icon>
            <CodeOutlined class="card-icon" />
          </template>
          <template #extra>
            <a-button type="primary" size="small">
              开始使用 <RightOutlined />
            </a-button>
          </template>
        </VbenGlassCard>
      </div>
    </div>

    <div class="usage-section">
      <h2 class="section-title">使用流程</h2>
      <div class="steps-container">
        <a-steps :current="0" direction="vertical">
          <a-step title="上传 Excel 文件">
            <template #description>
              <p>上传包含数据的 Excel 文件，系统自动解析表头和数据</p>
            </template>
          </a-step>
          <a-step title="输入 DDL 语句">
            <template #description>
              <p>输入或粘贴数据库表的 DDL 语句，系统自动解析字段信息</p>
            </template>
          </a-step>
          <a-step title="字段映射">
            <template #description>
              <p>系统自动匹配 Excel 列与数据库字段，支持手动调整</p>
            </template>
          </a-step>
          <a-step title="生成 SQL 语句">
            <template #description>
              <p>一键生成 SQL 语句，支持复制和导出</p>
            </template>
          </a-step>
        </a-steps>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  DatabaseOutlined,
  FileExcelOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  InsertRowAboveOutlined,
  EditOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'

const router = useRouter()

const navigateTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
.sql-tool-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 16px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 20px;
  color: #666;
  margin-bottom: 0;
  line-height: 1.6;
}

.feature-section {
  max-width: 1200px;
  margin: 0 auto 60px;
}

.feature-card {
  padding: 40px;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  font-size: 48px;
  color: #1890ff;
  margin-bottom: 16px;
}

.feature-content h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.feature-content p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 0;
}

.tools-section {
  max-width: 1200px;
  margin: 0 auto 60px;
}

.section-title {
  font-size: 32px;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin-bottom: 40px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.card-icon {
  font-size: 48px;
  color: #1890ff;
}

.usage-section {
  max-width: 800px;
  margin: 0 auto;
}

.steps-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 暗色主题支持 */
[data-theme='dark'] .sql-tool-page {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

[data-theme='dark'] .page-title {
  color: #60a5fa;
}

[data-theme='dark'] .page-subtitle {
  color: #9ca3af;
}

[data-theme='dark'] .feature-item {
  background: #1f2937;
}

[data-theme='dark'] .feature-content h3 {
  color: #f3f4f6;
}

[data-theme='dark'] .feature-content p {
  color: #9ca3af;
}

[data-theme='dark'] .section-title {
  color: #f3f4f6;
}

[data-theme='dark'] .steps-container {
  background: #1f2937;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .page-title {
    font-size: 36px;
  }

  .page-subtitle {
    font-size: 18px;
  }

  .feature-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 16px;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 24px;
  }

  .steps-container {
    padding: 24px;
  }
}

@media (max-width: 480px) {
  .sql-tool-page {
    padding: 20px 15px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .feature-icon {
    font-size: 36px;
  }
}
</style>
