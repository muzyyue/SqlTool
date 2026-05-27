/**
 * SQL语法高亮解析器
 * 支持SQL关键字、字符串、数字、注释、表名、字段名等元素的识别和高亮
 */

// SQL关键字列表
const SQL_KEYWORDS = [
  // 数据操作语言 (DML)
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  // 数据定义语言 (DDL)
  "CREATE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "RENAME",
  // 数据控制语言 (DCL)
  "GRANT",
  "REVOKE",
  // 事务控制语言 (TCL)
  "COMMIT",
  "ROLLBACK",
  "SAVEPOINT",
  "SET TRANSACTION",
  // 其他关键字
  "FROM",
  "WHERE",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "ON",
  "IN",
  "EXISTS",
  "NOT EXISTS",
  "LIKE",
  "BETWEEN",
  "AND",
  "OR",
  "NOT",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "UNION",
  "UNION ALL",
  "DISTINCT",
  "VALUES",
  "SET",
  "INTO",
  "AS",
  "IS",
  "NULL",
  "NULLS",
  "FIRST",
  "LAST",
  "ASC",
  "DESC",
  "LIMIT",
  "OFFSET",
  "TOP",
  "PERCENT",
  "WITH",
  "CTE",
  "PRIMARY KEY",
  "FOREIGN KEY",
  "REFERENCES",
  "CONSTRAINT",
  "INDEX",
  "UNIQUE",
  "CHECK",
  "DEFAULT",
  "AUTO_INCREMENT",
  "IDENTITY",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "IF",
  "ELSEIF",
  "WHILE",
  "DECLARE",
  "SET",
  "BEGIN",
  "END",
  "TRANSACTION",
  "USE",
  "DATABASE",
  "TABLE",
  "VIEW",
  "PROCEDURE",
  "FUNCTION",
  "TRIGGER",
  "SCHEMA",
  "ALTER TABLE",
  "CREATE TABLE",
  "DROP TABLE",
  "CREATE INDEX",
  "DROP INDEX",
];

/**
 * SQL token类型枚举
 */
const TOKEN_TYPES = {
  KEYWORD: "keyword",
  STRING: "string",
  NUMBER: "number",
  COMMENT: "comment",
  TABLE: "table",
  COLUMN: "column",
  OPERATOR: "operator",
  PUNCTUATION: "punctuation",
  IDENTIFIER: "identifier",
};

/**
 * SQL语法解析器类
 */
class SqlSyntaxParser {
  constructor() {
    this.keywords = new Set(SQL_KEYWORDS.map((k) => k.toUpperCase()));
  }

  /**
   * 解析SQL代码，返回token数组
   * @param {string} sql - SQL代码
   * @returns {Array} token数组
   */
  parse(sql) {
    if (!sql) return [];

    const tokens = [];
    let i = 0;
    const length = sql.length;

    while (i < length) {
      const char = sql[i];

      if (char === " " || char === "\t" || char === "\n" || char === "\r") {
        let whitespaceEnd = i;
        while (
          whitespaceEnd < length &&
          (sql[whitespaceEnd] === " " ||
            sql[whitespaceEnd] === "\t" ||
            sql[whitespaceEnd] === "\n" ||
            sql[whitespaceEnd] === "\r")
        ) {
          whitespaceEnd++;
        }
        tokens.push({
          type: "whitespace",
          value: sql.slice(i, whitespaceEnd),
          start: i,
          end: whitespaceEnd,
        });
        i = whitespaceEnd;
        continue;
      }

      // 注释处理
      if (char === "-" && i + 1 < length && sql[i + 1] === "-") {
        const comment = this._parseComment(sql, i);
        tokens.push({
          type: TOKEN_TYPES.COMMENT,
          value: comment.text,
          start: comment.start,
          end: comment.end,
        });
        i = comment.end;
        continue;
      }

      // 多行注释
      if (char === "/" && i + 1 < length && sql[i + 1] === "*") {
        const comment = this._parseMultiLineComment(sql, i);
        tokens.push({
          type: TOKEN_TYPES.COMMENT,
          value: comment.text,
          start: comment.start,
          end: comment.end,
        });
        i = comment.end;
        continue;
      }

      // 字符串处理 (单引号)
      if (char === "'") {
        const string = this._parseString(sql, i);
        tokens.push({
          type: TOKEN_TYPES.STRING,
          value: string.text,
          start: string.start,
          end: string.end,
        });
        i = string.end;
        continue;
      }

      // 字符串处理 (双引号)
      if (char === '"') {
        const string = this._parseString(sql, i, '"');
        tokens.push({
          type: TOKEN_TYPES.STRING,
          value: string.text,
          start: string.start,
          end: string.end,
        });
        i = string.end;
        continue;
      }

      // 数字处理
      if (this._isDigit(char)) {
        const number = this._parseNumber(sql, i);
        tokens.push({
          type: TOKEN_TYPES.NUMBER,
          value: number.text,
          start: number.start,
          end: number.end,
        });
        i = number.end;
        continue;
      }

      // 标识符处理 (表名、字段名)
      if (this._isIdentifierStart(char)) {
        const identifier = this._parseIdentifier(sql, i);
        tokens.push({
          type: TOKEN_TYPES.IDENTIFIER,
          value: identifier.text,
          start: identifier.start,
          end: identifier.end,
        });
        i = identifier.end;
        continue;
      }

      // 操作符和标点符号
      if ("()[]{};,.*+-/<>=".includes(char)) {
        tokens.push({
          type: TOKEN_TYPES.PUNCTUATION,
          value: char,
          start: i,
          end: i + 1,
        });
        i++;
        continue;
      }

      // 默认处理为普通字符
      tokens.push({
        type: "text",
        value: char,
        start: i,
        end: i + 1,
      });
      i++;
    }

    return this._classifyTokens(tokens);
  }

  /**
   * 解析单行注释
   * @param {string} sql - SQL代码
   * @param {number} start - 起始位置
   * @returns {Object} 注释对象
   * @private
   */
  _parseComment(sql, start) {
    let end = start + 2;
    while (end < sql.length && sql[end] !== "\n") {
      end++;
    }
    return {
      text: sql.slice(start, end),
      start: start,
      end: end,
    };
  }

  /**
   * 解析多行注释
   * @param {string} sql - SQL代码
   * @param {number} start - 起始位置
   * @returns {Object} 注释对象
   * @private
   */
  _parseMultiLineComment(sql, start) {
    let end = start + 2;
    while (end < sql.length && !(sql[end] === "*" && sql[end + 1] === "/")) {
      end++;
    }
    end += 2; // 包含结束的 */
    return {
      text: sql.slice(start, Math.min(end, sql.length)),
      start: start,
      end: Math.min(end, sql.length),
    };
  }

  /**
   * 解析字符串
   * @param {string} sql - SQL代码
   * @param {number} start - 起始位置
   * @param {string} quoteChar - 引号字符 (默认单引号)
   * @returns {Object} 字符串对象
   * @private
   */
  _parseString(sql, start, quoteChar = "'") {
    let end = start + 1;
    let escaped = false;

    while (end < sql.length) {
      if (escaped) {
        escaped = false;
      } else if (sql[end] === "\\") {
        escaped = true;
      } else if (sql[end] === quoteChar) {
        end++;
        break;
      }
      end++;
    }

    return {
      text: sql.slice(start, end),
      start: start,
      end: end,
    };
  }

  /**
   * 解析数字
   * @param {string} sql - SQL代码
   * @param {number} start - 起始位置
   * @returns {Object} 数字对象
   * @private
   */
  _parseNumber(sql, start) {
    let end = start;
    while (end < sql.length && (this._isDigit(sql[end]) || sql[end] === ".")) {
      end++;
    }
    return {
      text: sql.slice(start, end),
      start: start,
      end: end,
    };
  }

  /**
   * 解析标识符
   * @param {string} sql - SQL代码
   * @param {number} start - 起始位置
   * @returns {Object} 标识符对象
   * @private
   */
  _parseIdentifier(sql, start) {
    let end = start;
    while (end < sql.length && this._isIdentifierChar(sql[end])) {
      end++;
    }
    return {
      text: sql.slice(start, end),
      start: start,
      end: end,
    };
  }

  /**
   * 分类token，识别关键字、表名、字段名等
   * @param {Array} tokens - 原始token数组
   * @returns {Array} 分类后的token数组
   * @private
   */
  _classifyTokens(tokens) {
    const classified = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = { ...tokens[i] };

      if (token.type === TOKEN_TYPES.IDENTIFIER) {
        const value = token.value.toUpperCase();

        // 检查是否为关键字
        if (this.keywords.has(value)) {
          token.type = TOKEN_TYPES.KEYWORD;
          token.value = value; // 统一为大写
        }
        // 检查是否为特殊标识符
        else if (this._isSpecialIdentifier(token.value)) {
          // 特殊标识符保持为IDENTIFIER，不改变类型
          // 或者可以创建SPECIAL类型，但当前版本保持不变
        }
        // 检查上下文，判断是表名还是字段名
        else {
          const context = this._getTokenContext(tokens, i);
          if (this._isTableName(token.value, context)) {
            token.type = TOKEN_TYPES.TABLE;
          } else if (this._isColumnName(token.value, context)) {
            token.type = TOKEN_TYPES.COLUMN;
          }
        }
      }

      classified.push(token);
    }

    return classified;
  }

  /**
   * 获取token的上下文信息
   * @param {Array} tokens - 所有tokens
   * @param {number} index - token索引
   * @returns {Object} 上下文信息
   * @private
   */
  _getTokenContext(tokens, index) {
    const context = {
      previous: [],
      next: [],
    };

    // 获取前面的非空白token (最多3个)
    for (let i = index - 1; i >= 0 && context.previous.length < 3; i--) {
      if (!(tokens[i].type === "text" && !tokens[i].value.trim())) {
        context.previous.push(tokens[i]);
      }
    }

    // 获取后面的非空白token (最多3个)
    for (let i = index + 1; i < tokens.length && context.next.length < 3; i++) {
      if (!(tokens[i].type === "text" && !tokens[i].value.trim())) {
        context.next.push(tokens[i]);
      }
    }

    return context;
  }

  /**
   * 检查是否为表名
   * @param {string} value - 标识符值
   * @param {Object} context - 上下文信息
   * @returns {boolean}
   * @private
   */
  _isTableName(value, context) {
    // 在FROM后面的是表名
    if (context.previous.length > 0) {
      const prev = context.previous[0];
      if (
        (prev.type === TOKEN_TYPES.KEYWORD ||
          prev.type === TOKEN_TYPES.IDENTIFIER) &&
        prev.value.toUpperCase() === "FROM"
      ) {
        return true;
      }
    }

    // 在UPDATE后面的是表名
    if (context.previous.length > 0) {
      const prev = context.previous[0];
      if (
        (prev.type === TOKEN_TYPES.KEYWORD ||
          prev.type === TOKEN_TYPES.IDENTIFIER) &&
        prev.value.toUpperCase() === "UPDATE"
      ) {
        return true;
      }
    }

    // 在INTO后面的是表名 (INSERT INTO table_name)
    if (context.previous.length > 0) {
      const prev = context.previous[0];
      if (
        (prev.type === TOKEN_TYPES.KEYWORD ||
          prev.type === TOKEN_TYPES.IDENTIFIER) &&
        prev.value.toUpperCase() === "INTO"
      ) {
        return true;
      }
    }

    // 在JOIN后面的是表名
    if (context.previous.length > 0) {
      const prev = context.previous[0];
      if (
        (prev.type === TOKEN_TYPES.KEYWORD ||
          prev.type === TOKEN_TYPES.IDENTIFIER) &&
        prev.value.toUpperCase().includes("JOIN")
      ) {
        return true;
      }
    }

    // 检查是否是INSERT INTO statement中的表名
    // 对于INSERT INTO table_name，table_name前面紧跟着INTO
    const hasInsertKeywordBefore = context.previous.some(
      (token) =>
        (token.type === TOKEN_TYPES.KEYWORD ||
          token.type === TOKEN_TYPES.IDENTIFIER) &&
        token.value.toUpperCase() === "INSERT",
    );
    const hasIntoKeywordBefore = context.previous.some(
      (token) =>
        (token.type === TOKEN_TYPES.KEYWORD ||
          token.type === TOKEN_TYPES.IDENTIFIER) &&
        token.value.toUpperCase() === "INTO",
    );

    // 如果前面同时有INSERT和INTO，那么当前token是表名
    if (hasInsertKeywordBefore && hasIntoKeywordBefore) {
      return true;
    }

    // 特殊标识符 (但这些通常不是表名)
    return false;
  }

  /**
   * 检查是否为字段名
   * @param {string} value - 标识符值
   * @param {Object} context - 上下文信息
   * @returns {boolean}
   * @private
   */
  _isColumnName(value, context) {
    // 在INSERT INTO (field1, field2) 这种情况中，括号内的标识符是字段名
    const hasOpeningParenBefore = context.previous.some(
      (token) => token.type === TOKEN_TYPES.PUNCTUATION && token.value === "(",
    );

    if (hasOpeningParenBefore) {
      return true;
    }

    // 在SELECT后面的可能是字段名
    if (context.previous.length > 0) {
      const prev = context.previous[0];
      if (prev.type === TOKEN_TYPES.KEYWORD && prev.value === "SELECT") {
        return true;
      }
    }

    // 在VALUES后面的可能是字段名 (但通常VALUES后面跟的是值，不是字段名)
    // 这里需要更精确的判断

    // 如果前面是逗号分隔的列表中的标识符，很可能是字段名
    const hasCommaBefore = context.previous.some(
      (token) => token.type === TOKEN_TYPES.PUNCTUATION && token.value === ",",
    );

    if (hasCommaBefore) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否为特殊标识符
   * @param {string} value - 标识符值
   * @returns {boolean}
   * @private
   */
  _isSpecialIdentifier(value) {
    const specialIdentifiers = [
      "NULL",
      "TRUE",
      "FALSE",
      "DEFAULT",
      "CURRENT_TIMESTAMP",
      "NOW()",
    ];
    return specialIdentifiers.includes(value.toUpperCase());
  }

  /**
   * 检查字符是否为数字
   * @param {string} char - 字符
   * @returns {boolean}
   * @private
   */
  _isDigit(char) {
    return char >= "0" && char <= "9";
  }

  /**
   * 检查字符是否为标识符开始字符
   * @param {string} char - 字符
   * @returns {boolean}
   * @private
   */
  _isIdentifierStart(char) {
    return (
      (char >= "a" && char <= "z") ||
      (char >= "A" && char <= "Z") ||
      char === "_" ||
      char === "$"
    );
  }

  /**
   * 检查字符是否为标识符字符
   * @param {string} char - 字符
   * @returns {boolean}
   * @private
   */
  _isIdentifierChar(char) {
    return this._isIdentifierStart(char) || this._isDigit(char);
  }
}

/**
 * SQL语法高亮渲染器
 */
class SqlHighlighter {
  constructor() {
    this.parser = new SqlSyntaxParser();
  }

  /**
   * 将SQL代码转换为带语法高亮的HTML
   * @param {string} sql - SQL代码
   * @returns {string} 带语法高亮的HTML字符串
   */
  highlight(sql) {
    if (!sql) return "";

    const tokens = this.parser.parse(sql);
    return this._renderHighlightedHtml(tokens);
  }

  /**
   * 渲染带高亮的HTML
   * @param {Array} tokens - token数组
   * @returns {string} HTML字符串
   * @private
   */
  _renderHighlightedHtml(tokens) {
    let html = "";

    for (const token of tokens) {
      const escapedValue = this._escapeHtml(token.value);

      switch (token.type) {
        case TOKEN_TYPES.KEYWORD:
          html += `<span class="sql-keyword">${escapedValue}</span>`;
          break;
        case TOKEN_TYPES.STRING:
          html += `<span class="sql-string">${escapedValue}</span>`;
          break;
        case TOKEN_TYPES.NUMBER:
          html += `<span class="sql-number">${escapedValue}</span>`;
          break;
        case TOKEN_TYPES.COMMENT:
          html += `<span class="sql-comment">${escapedValue}</span>`;
          break;
        case TOKEN_TYPES.TABLE:
          html += `<span class="sql-table">${escapedValue}</span>`;
          break;
        case TOKEN_TYPES.COLUMN:
          html += `<span class="sql-column">${escapedValue}</span>`;
          break;
        case "whitespace":
          html += escapedValue;
          break;
        default:
          html += escapedValue;
      }
    }

    return html;
  }

  /**
   * HTML转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   * @private
   */
  _escapeHtml(text) {
    if (!text) return "";

    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };

    return text.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }
}

// 导出单例实例
export const sqlHighlighter = new SqlHighlighter();
export { SqlSyntaxParser, SqlHighlighter, TOKEN_TYPES };
