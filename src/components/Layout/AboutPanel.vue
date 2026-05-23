<template>
  <div class="about-panel">
    <div class="about-header">
      <div class="app-icon">
        <DatabaseOutlined />
      </div>
      <div class="app-info">
        <h2>SQL生成工具</h2>
        <p class="version">版本 2.0.0</p>
        <p class="description">基于DDL语句和Excel文件智能生成SQL语句的工具</p>
      </div>
    </div>

    <a-divider />

    <div class="about-content">
      <div class="info-section">
        <h3>功能特性</h3>
        <a-list item-layout="horizontal" :data-source="features">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              <a-list-item-meta :description="item.description">
                <template #title>
                  {{ item.title }}
                </template>
                <template #avatar>
                  <a-avatar :icon="item.icon" />
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </div>

      <a-divider />

      <div class="info-section">
        <h3>技术栈</h3>
        <div class="tech-stack">
          <a-tag color="blue" v-for="tech in frontendTechs" :key="tech">
            {{ tech }}
          </a-tag>
        </div>
        <div class="tech-stack">
          <a-tag color="green" v-for="tech in backendTechs" :key="tech">
            {{ tech }}
          </a-tag>
        </div>
      </div>

      <a-divider />

      <div class="info-section">
        <h3>系统信息</h3>
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item label="用户代理">
            {{ userAgent }}
          </a-descriptions-item>
          <a-descriptions-item label="屏幕分辨率">
            {{ screenResolution }}
          </a-descriptions-item>
          <a-descriptions-item label="语言">
            {{ navigatorLanguage }}
          </a-descriptions-item>
          <a-descriptions-item label="时区">
            {{ timezone }}
          </a-descriptions-item>
          <a-descriptions-item label="Cookie启用">
            {{ cookieEnabled ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="JavaScript启用">
            {{ javascriptEnabled ? '是' : '否' }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <a-divider />

      <div class="info-section">
        <h3>开发团队</h3>
        <div class="team-info">
          <p>SQL生成工具由专业开发团队精心打造，致力于提供高效、稳定的SQL生成解决方案。</p>
          <div class="contact-info">
            <p><strong>联系方式：</strong></p>
            <ul>
              <li>邮箱：support@sqltool.com</li>
              <li>GitHub：https://github.com/sqltool</li>
              <li>文档：https://docs.sqltool.com</li>
            </ul>
          </div>
        </div>
      </div>

      <a-divider />

      <div class="info-section">
        <h3>许可证</h3>
        <div class="license-info">
          <p>本软件基于MIT许可证开源发布，允许自由使用、修改和分发。</p>
          <a href="#" @click.prevent="showLicense">查看完整许可证</a>
        </div>
      </div>
    </div>

    <div class="about-footer">
      <p>© 2024 SQL生成工具 版权所有</p>
      <div class="footer-links">
        <a href="#" @click.prevent="checkUpdate">检查更新</a>
        <a-divider type="vertical" />
        <a href="#" @click.prevent="showChangelog">更新日志</a>
        <a-divider type="vertical" />
        <a href="#" @click.prevent="showPrivacy">隐私政策</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  TableOutlined,
  CodeOutlined,
  ExportOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

// 定义事件
// const emit = defineEmits(['close']) // 暂时注释掉，如果需要使用可以取消注释

// 响应式数据
const features = ref([
  {
    title: '智能字段映射',
    description: '基于名称相似度和拼音匹配算法，自动建立DDL字段与Excel列的映射关系',
    icon: TableOutlined,
  },
  {
    title: '多数据库支持',
    description: '支持MySQL、PostgreSQL、SQL Server等多种数据库语法',
    icon: DatabaseOutlined,
  },
  {
    title: '批量SQL生成',
    description: '支持大型Excel文件处理，智能分块生成高效的SQL语句',
    icon: FileTextOutlined,
  },
  {
    title: '实时预览',
    description: '语法高亮显示，支持格式化和压缩两种显示模式',
    icon: CodeOutlined,
  },
  {
    title: '多种导出方式',
    description: '支持SQL文件下载、剪贴板复制、直接导出到数据库',
    icon: ExportOutlined,
  },
  {
    title: '个性化设置',
    description: '丰富的配置选项，满足不同用户的个性化需求',
    icon: SettingOutlined,
  },
])

const frontendTechs = ref(['Vue 3', 'Ant Design Vue', 'Vite', 'ES6+', 'CSS3'])

const backendTechs = ref(['Node.js', 'Express', 'SQL Parser', 'XLSX', 'Pinyin'])

const userAgent = ref('')
const screenResolution = ref('')
const navigatorLanguage = ref('')
const timezone = ref('')
const cookieEnabled = ref(false)
const javascriptEnabled = ref(true)

// 方法
const loadSystemInfo = () => {
  userAgent.value = navigator.userAgent
  screenResolution.value = `${screen.width}x${screen.height}`
  navigatorLanguage.value = navigator.language
  timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
  cookieEnabled.value = navigator.cookieEnabled
  javascriptEnabled.value = true // 如果能运行这段代码，说明JavaScript已启用
}

const checkUpdate = () => {
  message.info('已是最新版本')
}

const showChangelog = () => {
  message.info('查看更新日志功能开发中')
}

const showLicense = () => {
  message.info('查看许可证功能开发中')
}

const showPrivacy = () => {
  message.info('查看隐私政策功能开发中')
}

// 生命周期
onMounted(() => {
  loadSystemInfo()
})
</script>

<style scoped>
.about-panel {
  max-height: 70vh;
  overflow-y: auto;
  contain: content;
}

.about-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.app-icon {
  font-size: 48px;
  color: #1890ff;
  margin-right: 16px;
}

.app-info h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
}

.version {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.description {
  margin: 4px 0 0 0;
  color: #999;
  font-size: 14px;
}

.about-content {
  margin-bottom: 24px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h3 {
  margin-bottom: 16px;
  color: #1890ff;
  font-size: 16px;
  font-weight: 600;
}

.tech-stack {
  margin-bottom: 8px;
}

.tech-stack .ant-tag {
  margin-bottom: 4px;
}

.team-info p {
  margin-bottom: 12px;
  line-height: 1.6;
}

.contact-info ul {
  margin: 8px 0 0 20px;
  color: #666;
}

.contact-info li {
  margin-bottom: 4px;
}

.license-info p {
  margin-bottom: 8px;
  line-height: 1.6;
}

.license-info a {
  color: #1890ff;
}

.about-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.about-footer p {
  margin-bottom: 8px;
  color: #666;
}

.footer-links a {
  color: #1890ff;
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .about-panel {
    max-height: 60vh;
  }

  .about-header {
    flex-direction: column;
    text-align: center;
  }

  .app-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .tech-stack {
    text-align: center;
  }
}

/* 动画效果 */
.app-icon {
  animation: float 3s ease-in-out infinite;
  will-change: transform;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.info-section {
  animation: fadeInUp 0.5s ease-out;
  will-change: transform, opacity;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
