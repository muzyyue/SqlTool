import { useDdlParser } from './src/composables/useDdlParser.js'

// 提供的SQL语句（MySQL语法）
const sqlStatements = `CREATE TABLE \`files\` (
   \`fid\` int NOT NULL AUTO_INCREMENT,
   \`realname\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
   \`path\` varchar(255) DEFAULT NULL,
   \`uploaderName\` varchar(255) DEFAULT NULL,
   \`date\` datetime DEFAULT NULL,
   \`filesize\` double DEFAULT NULL,
   \`time\` int DEFAULT NULL,
   \`filetype\` varchar(255) DEFAULT NULL,
   \`fphoto\` varchar(255) DEFAULT NULL,
   PRIMARY KEY (\`fid\`)
 ) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

 CREATE DEFINER=\`root\`@\`localhost\` TRIGGER \`tb_files_insert_trigger\` AFTER INSERT ON \`files\` FOR EACH ROW begin
     INSERT into log (id,\`describe\`,info,date) VALUES
 	 (null,"添加",CONCAT('添加的数据内容为：fid=',new.fid,',realname=',new.realname,',type=',new.filetype,',上传者name:',new.uploaderName),NOW());
 end;

 CREATE DEFINER=\`root\`@\`localhost\` TRIGGER \`tb_files_update_trigger\` AFTER UPDATE ON \`files\` FOR EACH ROW begin
     INSERT into log (id,\`describe\`,info,date) VALUES
 	 (null,"修改",
 	 CONCAT('旧数据内容为：fid=',new.fid,',realname=',new.realname,',type=',new.filetype,',上传者:',new.uploaderName,',||||修改的新数据内容为：fid=',new.fid,',realname=',new.realname,',type=',new.filetype,',上传者:',new.uploaderName),NOW());
 end;`;

async function testDdlParser() {
    console.log('=== DDL解析器测试开始 ===')

    try {
        // 初始化解析器
        const ddlParser = useDdlParser()

        // 解析DDL语句
        const parseResult = await ddlParser.parseDdl(sqlStatements, true)

        console.log('\n=== 解析结果 ===')
        console.log('数据库类型:', parseResult.databaseType)
        console.log('表名:', parseResult.tableName)
        console.log('字段数量:', parseResult.fields?.length || 0)
        console.log('索引数量:', parseResult.indexes?.length || 0)
        console.log('约束数量:', parseResult.constraints?.length || 0)
        console.log('触发器数量:', parseResult.triggers?.length || 0)

        console.log('\n=== 字段详情 ===')
        parseResult.fields?.forEach((field, index) => {
            console.log(`${index + 1}. ${field.name}: ${field.type} (Nullable: ${field.nullable}, Default: ${field.defaultValue})`)
        })

        console.log('\n=== 触发器详情 ===')
        if (parseResult.triggers?.length > 0) {
            parseResult.triggers.forEach((trigger, index) => {
                console.log(`${index + 1}. ${trigger.name}: ${trigger.timing} ${trigger.events} ON ${trigger.table}`)
                console.log(`   触发器体: ${trigger.body}`)
            })
        } else {
            console.log('未提取到触发器')
        }

        console.log('\n=== 解析结果完整信息 ===')
        console.log(JSON.stringify(parseResult, null, 2))

    } catch (error) {
        console.error('解析失败:', error)
    }
}

// 运行测试
testDdlParser()
