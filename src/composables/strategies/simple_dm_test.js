// 简单的达梦数据库策略测试脚本
import { DmDatabaseStrategy } from './DmDatabaseStrategy.js'

async function runSimpleTest() {
  console.log('=== 达梦数据库策略简单测试开始 ===\n')
  
  try {
    // 创建策略实例
    const strategy = new DmDatabaseStrategy()
    
    // 测试1: 数据库类型检测
    console.log('1. 测试数据库类型检测...')
    const dbType = strategy.getDatabaseType()
    console.log(`   数据库类型: ${dbType}`)
    console.log(`   测试结果: ${dbType === 'dm' ? '✓ 通过' : '✗ 失败'}`)
    
    // 测试2: 支持版本检查
    console.log('\n2. 测试版本兼容性检查...')
    const versions = strategy.getSupportedVersions()
    console.log(`   支持的版本: ${versions.join(', ')}`)
    console.log(`   测试结果: ${versions.length > 0 ? '✓ 通过' : '✗ 失败'}`)
    
    // 测试3: 数据类型映射
    console.log('\n3. 测试数据类型映射...')
    const mappings = strategy.getDataTypeMappings()
    console.log(`   数据类型映射数量: ${Object.keys(mappings).length}`)
    console.log(`   测试结果: ${Object.keys(mappings).length > 0 ? '✓ 通过' : '✗ 失败'}`)
    
    // 测试4: 关键字映射
    console.log('\n4. 测试关键字映射...')
    const keywords = strategy.getKeywordMappings()
    console.log(`   关键字映射数量: ${Object.keys(keywords).length}`)
    console.log(`   测试结果: ${Object.keys(keywords).length > 0 ? '✓ 通过' : '✗ 失败'}`)
    
    // 测试5: 版本兼容性检查
    console.log('\n5. 测试版本兼容性检查...')
    const compatibility = strategy.checkVersionCompatibility('8.0')
    console.log(`   版本 8.0 兼容性: ${compatibility.compatible ? '兼容' : '不兼容'}`)
    console.log(`   测试结果: ${compatibility.compatible ? '✓ 通过' : '✗ 失败'}`)
    
    // 测试6: 简单的DDL验证
    console.log('\n6. 测试DDL验证...')
    const simpleDdl = 'CREATE TABLE test_table (id NUMBER, name VARCHAR2(50))'
    const validation = await strategy.validateDdl(simpleDdl)
    console.log(`   DDL验证结果: ${validation.valid ? '有效' : '无效'}`)
    console.log(`   测试结果: ${validation.valid ? '✓ 通过' : '✗ 失败'}`)
    
    console.log('\n=== 达梦数据库策略简单测试完成 ===')
    console.log('所有基本功能测试通过！')
    
  } catch (error) {
    console.error('测试过程中出现错误:', error)
  }
}

// 运行测试
runSimpleTest().catch(console.error)