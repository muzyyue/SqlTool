<template>
  <div class="home-page">
    <!-- 英雄区域 -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">SQL生成工具</h1>
        <p class="hero-subtitle">基于DDL语句和Excel数据，快速生成规范的INSERT和UPDATE SQL语句</p>
        <div class="hero-actions">
          <a-button type="primary" size="large" @click="navigateToInsert">
            <template #icon><PlusCircleOutlined /></template>
            开始生成INSERT
          </a-button>
          <a-button size="large" @click="navigateToUpdate">
            <template #icon><EditOutlined /></template>
            开始生成UPDATE
          </a-button>
        </div>
      </div>
      <div class="hero-image">
        <div class="code-preview">
          <pre class="sql-example">{{ sqlExample }}</pre>
        </div>
      </div>
    </div>

    <!-- 功能特性区域 -->
    <div class="features-section">
      <div class="section-header">
        <h2>核心功能特性</h2>
        <p>提供全面的SQL生成解决方案，满足不同场景需求</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <DatabaseOutlined />
          </div>
          <h3>智能DDL解析</h3>
          <p>支持多种数据库语法，自动解析表结构和字段信息，准确提取数据类型和约束</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <FileExcelOutlined />
          </div>
          <h3>Excel数据导入</h3>
          <p>支持.xlsx、.xls、.csv格式，处理大型文件，自动识别表头和多工作表</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <LinkOutlined />
          </div>
          <h3>智能字段匹配</h3>
          <p>基于名称相似度和拼音首字母，自动建立字段映射关系，支持手动调整</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <CodeOutlined />
          </div>
          <h3>多数据库支持</h3>
          <p>生成符合MySQL、PostgreSQL、SQL Server等主流数据库语法的SQL语句</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <SafetyCertificateOutlined />
          </div>
          <h3>语法验证</h3>
          <p>内置SQL语法检查，确保生成的语句符合ANSI SQL标准，避免语法错误</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <DownloadOutlined />
          </div>
          <h3>多种导出方式</h3>
          <p>支持复制到剪贴板、下载SQL文件、实时预览等多种输出方式</p>
        </div>
      </div>
    </div>

    <!-- 使用流程区域 -->
    <div class="workflow-section">
      <div class="section-header">
        <h2>使用流程</h2>
        <p>简单四步，快速生成符合需求的SQL语句</p>
      </div>

      <div class="workflow-steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>输入DDL语句</h3>
            <p>输入CREATE TABLE语句，系统自动解析表结构</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>上传Excel文件</h3>
            <p>上传包含数据的Excel文件，支持多工作表</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>配置字段映射</h3>
            <p>自动或手动建立DDL字段与Excel列的映射关系</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>生成SQL语句</h3>
            <p>一键生成规范的SQL语句，支持预览和导出</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速开始区域 -->
    <div class="quick-start-section">
      <div class="section-header">
        <h2>快速开始</h2>
        <p>选择适合您需求的SQL生成方式</p>
      </div>

      <div class="quick-start-cards">
        <div class="start-card insert-card" @click="navigateToInsert">
          <div class="card-header">
            <PlusCircleOutlined class="card-icon" />
            <h3>INSERT语句生成</h3>
          </div>
          <div class="card-content">
            <p>适用于批量插入新数据</p>
            <ul>
              <li>生成多行INSERT语句</li>
              <li>支持批量插入优化</li>
              <li>自动处理数据类型转换</li>
            </ul>
          </div>
          <div class="card-footer">
            <a-button type="primary" block>开始使用</a-button>
          </div>
        </div>

        <div class="start-card update-card" @click="navigateToUpdate">
          <div class="card-header">
            <EditOutlined class="card-icon" />
            <h3>UPDATE语句生成</h3>
          </div>
          <div class="card-content">
            <p>适用于批量更新现有数据</p>
            <ul>
              <li>生成带条件的UPDATE语句</li>
              <li>支持多种条件逻辑</li>
              <li>灵活配置更新字段</li>
            </ul>
          </div>
          <div class="card-footer">
            <a-button type="primary" block>开始使用</a-button>
          </div>
        </div>

        <div class="start-card ddl-card" @click="navigateToDdl">
          <div class="card-header">
            <TableOutlined class="card-icon" />
            <h3>DDL语句生成</h3>
          </div>
          <div class="card-content">
            <p>适用于数据库表结构管理</p>
            <ul>
              <li>支持多种DDL语句类型</li>
              <li>多数据库语法兼容</li>
              <li>可视化表结构设计</li>
            </ul>
          </div>
          <div class="card-footer">
            <a-button type="primary" block>开始使用</a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计数据区域 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-item">
          <a-statistic title="已处理文件" :value="stats.filesProcessed" />
        </div>
        <div class="stat-item">
          <a-statistic title="生成语句数" :value="stats.statementsGenerated" />
        </div>
        <div class="stat-item">
          <a-statistic title="用户满意度" :value="stats.userSatisfaction" suffix="%" />
        </div>
        <div class="stat-item">
          <a-statistic title="平均处理时间" :value="stats.avgProcessingTime" suffix="ms" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  PlusCircleOutlined,
  EditOutlined,
  DatabaseOutlined,
  FileExcelOutlined,
  LinkOutlined,
  CodeOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  TableOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()

// 示例SQL代码
const sqlExample = ref(`-- 示例：生成的INSERT语句
INSERT INTO users (id, name, email, created_at) VALUES
(1, '张三', 'zhangsan@example.com', '2024-01-15 10:30:00'),
(2, '李四', 'lisi@example.com', '2024-01-15 11:00:00'),
(3, '王五', 'wangwu@example.com', '2024-01-15 11:30:00');

-- 示例：生成的UPDATE语句
UPDATE products SET
  price = 99.99,
  stock = 50,
  updated_at = NOW()
WHERE category = 'electronics';`)

// 统计数据
const stats = ref({
  filesProcessed: 1234,
  statementsGenerated: 56789,
  userSatisfaction: 98.5,
  avgProcessingTime: 250,
})

// 导航方法
const navigateToInsert = () => {
  router.push('/insert')
}

const navigateToUpdate = () => {
  router.push('/update')
}

const navigateToDdl = () => {
  router.push('/ddl')
}

// 生命周期
onMounted(() => {
  // 可以在这里加载实际的统计数据
  console.log('首页已加载')
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 英雄区域样式 */
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  padding: 80px 0;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-content {
  padding-left: 40px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 20px;
  color: #666;
  margin-bottom: 32px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
}

.hero-image {
  padding-right: 40px;
}

.code-preview {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.sql-example {
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

/* 功能特性区域 */
.features-section {
  background: white;
  padding: 80px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-header h2 {
  font-size: 36px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.section-header p {
  font-size: 18px;
  color: #666;
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.feature-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 48px;
  color: #1890ff;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* 使用流程区域 */
.workflow-section {
  background: #f8f9fa;
  padding: 80px 0;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.step-number {
  background: #1890ff;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.step-content p {
  color: #666;
  line-height: 1.6;
}

/* 快速开始区域 */
.quick-start-section {
  background: white;
  padding: 80px 0;
}

.quick-start-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.start-card {
  background: white;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.start-card:hover {
  border-color: #1890ff;
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.insert-card:hover {
  border-color: #52c41a;
}

.update-card:hover {
  border-color: #faad14;
}

.ddl-card:hover {
  border-color: #722ed1;
}

.card-header {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: white;
  padding: 30px;
  text-align: center;
}

.insert-card .card-header {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.update-card .card-header {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.ddl-card .card-header {
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
}

.card-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.card-content {
  padding: 30px;
}

.card-content p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.card-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.card-content li {
  padding: 8px 0;
  color: #666;
  position: relative;
  padding-left: 20px;
}

.card-content li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #52c41a;
  font-weight: bold;
}

.card-footer {
  padding: 0 30px 30px;
}

/* 统计数据区域 */
.stats-section {
  background: #001529;
  color: white;
  padding: 60px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.stat-item {
  text-align: center;
}

.stat-item :deep(.ant-statistic-title) {
  color: rgba(255, 255, 255, 0.85);
  font-size: 16px;
}

.stat-item :deep(.ant-statistic-content) {
  color: white;
  font-size: 32px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .hero-section {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
    padding: 60px 20px;
  }

  .hero-content {
    padding-left: 0;
  }

  .hero-image {
    padding-right: 0;
  }

  .features-grid,
  .quick-start-cards {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .workflow-steps {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 18px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .section-header h2 {
    font-size: 28px;
  }

  .section-header p {
    font-size: 16px;
  }

  .features-grid,
  .quick-start-cards {
    padding: 0 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 40px 15px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .features-grid,
  .quick-start-cards {
    grid-template-columns: 1fr;
  }

  .feature-card,
  .start-card {
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
