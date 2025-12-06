<script setup>
import { useRouter } from 'vue-router'
import { PlusCircleOutlined, EditOutlined } from '@ant-design/icons-vue'

const router = useRouter()

// 跳转到INSERT页面
const goToInsert = () => {
  router.push('/insert')
}

// 跳转到UPDATE页面
const goToUpdate = () => {
  router.push('/update')
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Excel转SQL工具</h1>
      <p>选择您需要生成的SQL语句类型</p>
    </header>

    <main class="app-main">
      <div class="home-section">
        <div class="tool-description">
          <h2>工具介绍</h2>
          <p>本工具可以帮助您快速将Excel数据转换为SQL语句，支持生成INSERT和UPDATE语句。</p>
          <ul>
            <li>支持Excel文件上传和解析</li>
            <li>动态添加字段和设置值</li>
            <li>支持选择数据库函数</li>
            <li>支持字段类型设置和过滤</li>
            <li>支持生成批量SQL语句</li>
          </ul>
        </div>

        <div class="action-buttons">
          <a-button type="primary" size="large" @click="goToInsert" class="action-button">
            <template #icon>
              <plus-circle-outlined />
            </template>
            生成 INSERT 语句
          </a-button>

          <a-button type="default" size="large" @click="goToUpdate" class="action-button">
            <template #icon>
              <edit-outlined />
            </template>
            生成 UPDATE 语句
          </a-button>
        </div>

        <div class="feature-list">
          <div class="feature-item">
            <h3>INSERT 功能</h3>
            <p>将Excel数据转换为批量插入语句，支持一对多数据项识别、动态字段添加、字段过滤等功能。</p>
          </div>

          <div class="feature-item">
            <h3>UPDATE 功能</h3>
            <p>生成基于主键的更新语句，支持选择多个主键字段作为WHERE条件，灵活配置更新字段。</p>
          </div>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>© 2024 Excel转SQL工具 - 提升数据库操作效率</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  margin-bottom: 50px;
  width: 100%;
}

.app-header h1 {
  color: #1890ff;
  font-size: 36px;
  margin-bottom: 10px;
}

.app-header p {
  font-size: 18px;
  color: #666;
}

.home-section {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 40px;
  flex: 1;
}

.tool-description {
  text-align: center;
  margin-bottom: 40px;
}

.tool-description h2 {
  color: #333;
  margin-bottom: 15px;
}

.tool-description p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.tool-description ul {
  list-style: none;
  padding: 0;
  max-width: 600px;
  margin: 0 auto;
  text-align: left;
}

.tool-description li {
  padding: 8px 0;
  padding-left: 25px;
  position: relative;
  color: #666;
}

.tool-description li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #52c41a;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 50px;
  flex-wrap: wrap;
  width: 100%;
}

.action-button {
  padding: 12px 36px;
  font-size: 18px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.feature-item {
  background-color: #fafafa;
  padding: 20px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-item h3 {
  color: #1890ff;
  margin-bottom: 10px;
}

.feature-item p {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.app-footer {
  text-align: center;
  margin-top: 50px;
  padding: 20px 0;
  color: #999;
  font-size: 14px;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 28px;
  }

  .home-section {
    padding: 20px;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .action-button {
    width: 200px;
  }
}
</style>
