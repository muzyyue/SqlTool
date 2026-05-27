import { DatabaseStrategy } from "../useDatabaseStrategy.js";

/**
 * SQL Server数据库策略实现
 */
export class SqlServerStrategy extends DatabaseStrategy {
  constructor() {
    super();
    this.databaseType = "sqlserver";
    this.supportedVersions = [
      "2008",
      "2012",
      "2014",
      "2016",
      "2017",
      "2019",
      "2022",
    ];
    this.dataTypeMappings = this.initDataTypeMappings();
    this.keywordMappings = this.initKeywordMappings();
  }

  getDatabaseType() {
    return this.databaseType;
  }

  getSupportedVersions() {
    return this.supportedVersions;
  }

  async parseDdl(ddlStatement) {
    console.log("=== SQL Server DDL解析开始 ===");

    const result = {
      tableName: "",
      fields: [],
      indexes: [],
      constraints: [],
      databaseType: this.databaseType,
      version: this.detectVersion(ddlStatement),
    };

    try {
      // 1. 提取表名
      result.tableName = this.extractTableName(ddlStatement);

      // 2. 提取字段定义
      result.fields = this.extractFieldDefinitions(ddlStatement);

      // 3. 提取索引
      result.indexes = this.extractIndexes(ddlStatement);

      // 4. 提取约束
      result.constraints = this.extractConstraints(ddlStatement);

      console.log("SQL Server DDL解析成功:", result);
      return result;
    } catch (error) {
      console.error("SQL Server DDL解析失败:", error);
      throw error;
    }
  }

  async convertDdl(ddlStatement, targetDatabaseType) {
    console.log(`将SQL Server DDL转换为${targetDatabaseType}语法`);

    const parsedResult = await this.parseDdl(ddlStatement);
    return this.convertParsedResult(parsedResult, targetDatabaseType);
  }

  async validateDdl(ddlStatement) {
    const errors = [];

    if (!ddlStatement.toLowerCase().includes("create table")) {
      errors.push("DDL语句必须包含CREATE TABLE关键字");
    }

    const tableName = this.extractTableName(ddlStatement);
    if (!tableName) {
      errors.push("无法提取有效的表名");
    }

    const fields = this.extractFieldDefinitions(ddlStatement);
    if (fields.length === 0) {
      errors.push("未找到有效的字段定义");
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  getDataTypeMappings() {
    return this.dataTypeMappings;
  }

  getKeywordMappings() {
    return this.keywordMappings;
  }

  checkVersionCompatibility(version) {
    const currentVersion = parseInt(version);

    for (const supportedVersion of this.supportedVersions) {
      const supportedVersionNum = parseInt(supportedVersion);

      if (currentVersion >= supportedVersionNum) {
        return { compatible: true, recommendedVersion: supportedVersion };
      }
    }

    return {
      compatible: false,
      recommendedVersion:
        this.supportedVersions[this.supportedVersions.length - 1],
      message: `SQL Server ${version} 不在支持的版本范围内`,
    };
  }

  // ========== 私有方法 ==========

  initDataTypeMappings() {
    return {
      // SQL Server特有数据类型
      DATETIME2: "DATETIME",
      DATETIMEOFFSET: "TIMESTAMP",
      SMALLDATETIME: "DATETIME",
      MONEY: "DECIMAL",
      SMALLMONEY: "DECIMAL",
      IMAGE: "BLOB",
      NTEXT: "TEXT",
      SQL_VARIANT: "VARCHAR",
      HIERARCHYID: "VARCHAR",
      GEOMETRY: "VARCHAR",
      GEOGRAPHY: "VARCHAR",

      // 通用类型映射
      INT: "INTEGER",
      INTEGER: "INT",
      VARCHAR: "VARCHAR",
      TEXT: "TEXT",
      DATETIME: "TIMESTAMP",
    };
  }

  initKeywordMappings() {
    return {
      "IDENTITY(1,1)": "AUTO_INCREMENT",
      "ON [PRIMARY]": "",
      "TEXTIMAGE_ON [PRIMARY]": "",
      "WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)":
        "",
      GO: "",
    };
  }

  extractTableName(ddlStatement) {
    const tableNameRegex = /CREATE\s+TABLE\s+(?:\[?\w+\]?\.)?\[?([\w.]+)\]?/i;
    const match = ddlStatement.match(tableNameRegex);

    if (match && match[1]) {
      return match[1].replace(/[[]]/g, "");
    }

    return "";
  }

  extractFieldDefinitions(ddlStatement) {
    const fields = [];

    const fieldSectionMatch = ddlStatement.match(
      /CREATE\s+TABLE[^(]*\(([\s\S]*?)\)/i,
    );
    if (!fieldSectionMatch) return fields;

    const fieldSection = fieldSectionMatch[1];
    const fieldDefinitions = this.splitFieldDefinitions(fieldSection);

    for (const fieldDef of fieldDefinitions) {
      const field = this.parseFieldDefinition(fieldDef);
      if (field) {
        fields.push(field);
      }
    }

    return fields;
  }

  splitFieldDefinitions(fieldSection) {
    const definitions = [];
    let currentDef = "";
    let parenDepth = 0;

    for (let i = 0; i < fieldSection.length; i++) {
      const char = fieldSection[i];

      if (char === "(") {
        parenDepth++;
      } else if (char === ")") {
        parenDepth--;
      }

      if (char === "," && parenDepth === 0) {
        if (currentDef.trim()) {
          definitions.push(currentDef.trim());
        }
        currentDef = "";
      } else {
        currentDef += char;
      }
    }

    if (currentDef.trim()) {
      definitions.push(currentDef.trim());
    }

    return definitions;
  }

  parseFieldDefinition(fieldDef) {
    if (
      fieldDef.toUpperCase().startsWith("PRIMARY KEY") ||
      fieldDef.toUpperCase().startsWith("FOREIGN KEY") ||
      fieldDef.toUpperCase().startsWith("UNIQUE") ||
      fieldDef.toUpperCase().startsWith("CONSTRAINT")
    ) {
      return null;
    }

    const field = {
      name: "",
      type: "",
      nullable: true,
      defaultValue: null,
      isIdentity: false,
      comment: "",
    };

    // 提取字段名
    const nameMatch = fieldDef.match(/^\[?([\w.]+)\]?/);
    if (nameMatch) {
      field.name = nameMatch[1].replace(/[[]]/g, "");
    }

    // 提取数据类型
    const typeMatch = fieldDef.match(/\s+\[?(\w+(?:\([^)]*\))?)\]?/);
    if (typeMatch) {
      field.type = typeMatch[1].toUpperCase();
    }

    // 检查是否可为空
    field.nullable = !fieldDef.toUpperCase().includes("NOT NULL");

    // 检查自增属性
    field.isIdentity = fieldDef.toUpperCase().includes("IDENTITY");

    // 提取默认值
    const defaultValueMatch = fieldDef.match(/DEFAULT\s+([^,\s]+)/i);
    if (defaultValueMatch) {
      field.defaultValue = defaultValueMatch[1];
    }

    // 提取注释
    const commentMatch = fieldDef.match(/--\s*([^\n]*)/i);
    if (commentMatch) {
      field.comment = commentMatch[1];
    }

    return field;
  }

  extractIndexes(ddlStatement) {
    const indexes = [];

    // 提取索引定义
    const indexRegex =
      /CREATE\s+(?:UNIQUE\s+)?(?:NONCLUSTERED\s+)?INDEX\s+\[?([\w.]+)\]?\s+ON\s+[\w.]+\s*\(([^)]+)\)/gi;
    let match;

    while ((match = indexRegex.exec(ddlStatement)) !== null) {
      indexes.push({
        name: match[1].replace(/[[]]/g, ""),
        columns: match[2]
          .split(",")
          .map((col) => col.trim().replace(/[[]]/g, "")),
        unique: match[0].toUpperCase().includes("UNIQUE"),
        clustered: !match[0].toUpperCase().includes("NONCLUSTERED"),
      });
    }

    return indexes;
  }

  extractConstraints(ddlStatement) {
    const constraints = [];

    // 提取主键约束
    const primaryKeyMatch = ddlStatement.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (primaryKeyMatch) {
      constraints.push({
        type: "PRIMARY KEY",
        columns: primaryKeyMatch[1]
          .split(",")
          .map((col) => col.trim().replace(/[[]]/g, "")),
      });
    }

    // 提取外键约束
    const foreignKeyRegex =
      /CONSTRAINT\s+\[?([\w.]+)\]?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[\w.]+\s*\(([^)]+)\)/gi;
    let fkMatch;

    while ((fkMatch = foreignKeyRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: "FOREIGN KEY",
        name: fkMatch[1].replace(/[[]]/g, ""),
        columns: fkMatch[2]
          .split(",")
          .map((col) => col.trim().replace(/[[]]/g, "")),
        referenceColumns: fkMatch[3]
          .split(",")
          .map((col) => col.trim().replace(/[[]]/g, "")),
      });
    }

    // 提取默认值约束
    const defaultRegex =
      /CONSTRAINT\s+\[?([\w.]+)\]?\s+DEFAULT\s+([^\s]+)\s+FOR\s+\[?([\w.]+)\]?/gi;
    let defaultMatch;

    while ((defaultMatch = defaultRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: "DEFAULT",
        name: defaultMatch[1].replace(/[[]]/g, ""),
        column: defaultMatch[3].replace(/[[]]/g, ""),
        defaultValue: defaultMatch[2],
      });
    }

    // 提取检查约束
    const checkRegex = /CONSTRAINT\s+\[?([\w.]+)\]?\s+CHECK\s*\(([^)]+)\)/gi;
    let checkMatch;

    while ((checkMatch = checkRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: "CHECK",
        name: checkMatch[1].replace(/[[]]/g, ""),
        condition: checkMatch[2].trim(),
      });
    }

    return constraints;
  }

  detectVersion(ddlStatement) {
    // 通过语法特征检测SQL Server版本
    if (ddlStatement.includes("DATETIME2")) {
      return "2008"; // SQL Server 2008开始支持DATETIME2
    }

    if (ddlStatement.includes("JSON")) {
      return "2016"; // SQL Server 2016开始支持JSON
    }

    if (ddlStatement.includes("IDENTITY")) {
      return "2012"; // SQL Server 2012增强IDENTITY功能
    }

    return "2008"; // 默认版本
  }

  convertParsedResult(parsedResult, targetDatabaseType) {
    return {
      original: parsedResult,
      converted: {
        tableName: parsedResult.tableName,
        databaseType: targetDatabaseType,
        fields: parsedResult.fields.map((field) => ({
          ...field,
          type: this.mapDataType(field.type, targetDatabaseType),
        })),
        indexes: parsedResult.indexes,
        constraints: parsedResult.constraints,
      },
    };
  }

  mapDataType(sqlserverType, targetDb) {
    const mappings = {
      mysql: {
        DATETIME2: "DATETIME",
        DATETIMEOFFSET: "TIMESTAMP",
        SMALLDATETIME: "DATETIME",
        MONEY: "DECIMAL(19,4)",
        SMALLMONEY: "DECIMAL(10,4)",
        IMAGE: "LONGBLOB",
        NTEXT: "LONGTEXT",
        IDENTITY: "AUTO_INCREMENT",
      },
      postgresql: {
        DATETIME2: "TIMESTAMP",
        DATETIMEOFFSET: "TIMESTAMPTZ",
        SMALLDATETIME: "TIMESTAMP",
        MONEY: "MONEY",
        SMALLMONEY: "MONEY",
        IMAGE: "BYTEA",
        NTEXT: "TEXT",
        IDENTITY: "SERIAL",
      },
      oracle: {
        DATETIME2: "DATE",
        DATETIMEOFFSET: "TIMESTAMP",
        SMALLDATETIME: "DATE",
        MONEY: "NUMBER(19,4)",
        SMALLMONEY: "NUMBER(10,4)",
        IMAGE: "BLOB",
        NTEXT: "CLOB",
        IDENTITY: "NUMBER GENERATED ALWAYS AS IDENTITY",
      },
    };

    return mappings[targetDb]?.[sqlserverType] || sqlserverType;
  }
}
