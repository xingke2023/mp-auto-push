// 首先加载环境变量
require('dotenv').config({ override: true });

const mysql = require('mysql2/promise');
const { logger } = require('./logger');

/**
 * 数据库连接管理
 */
class Database {
    constructor() {
        this.pool = null;

        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'template1',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        };
    }

    /**
     * 初始化数据库连接池
     */
    async init() {
        try {
            if (this.pool) {
                return this.pool;
            }

            logger.info('[DB] 正在初始化数据库连接池...');
            logger.info(`[DB] 连接配置: ${this.config.host}:${this.config.port}/${this.config.database}`);

            this.pool = mysql.createPool(this.config);

            // 测试连接
            const connection = await this.pool.getConnection();
            logger.info('[DB] 数据库连接成功');
            connection.release();

            // 初始化表结构
            await this.initTables();

            return this.pool;
        } catch (error) {
            logger.error('[DB] 数据库连接失败:', error);
            throw error;
        }
    }

    /**
     * 初始化表结构
     */
    async initTables() {
        try {
            logger.info('[DB] 检查并创建数据表...');

            // 创建 imagesbase 表
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS imagesbase (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    url VARCHAR(500) NOT NULL COMMENT '微信图片URL',
                    basename VARCHAR(100) NOT NULL DEFAULT 'insurance' COMMENT '基础名称',
                    original_url VARCHAR(500) DEFAULT NULL COMMENT '原始图片URL（如果有）',
                    file_size INT DEFAULT NULL COMMENT '文件大小（字节）',
                    content_type VARCHAR(50) DEFAULT NULL COMMENT '文件类型',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    INDEX idx_basename (basename),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图片存储表';
            `;

            await this.pool.query(createTableSQL);
            logger.info('[DB] 数据表初始化完成');
        } catch (error) {
            logger.error('[DB] 初始化表结构失败:', error);
            throw error;
        }
    }

    /**
     * 获取连接池
     */
    getPool() {
        if (!this.pool) {
            throw new Error('数据库连接池未初始化，请先调用 init()');
        }
        return this.pool;
    }

    /**
     * 保存图片记录
     * @param {Object} imageData - 图片数据
     * @param {string} imageData.url - 微信图片URL
     * @param {string} imageData.basename - 基础名称，默认 'insurance'
     * @param {string} imageData.original_url - 原始图片URL（可选）
     * @param {number} imageData.file_size - 文件大小（可选）
     * @param {string} imageData.content_type - 文件类型（可选）
     * @returns {Promise<number>} 插入的记录ID
     */
    async saveImage(imageData) {
        try {
            const {
                url,
                basename = 'insurance',
                original_url = null,
                file_size = null,
                content_type = null
            } = imageData;

            if (!url) {
                throw new Error('url 参数不能为空');
            }

            const sql = `
                INSERT INTO imagesbase (url, basename, original_url, file_size, content_type)
                VALUES (?, ?, ?, ?, ?)
            `;

            const [result] = await this.pool.execute(sql, [
                url,
                basename,
                original_url,
                file_size,
                content_type
            ]);

            logger.info(`[DB] 图片记录保存成功 - ID: ${result.insertId}, basename: ${basename}`);
            return result.insertId;
        } catch (error) {
            logger.error('[DB] 保存图片记录失败:', error);
            throw error;
        }
    }

    /**
     * 查询图片记录
     * @param {Object} options - 查询选项
     * @param {string} options.basename - 基础名称
     * @param {number} options.limit - 限制数量
     * @param {number} options.offset - 偏移量
     * @returns {Promise<Array>} 图片记录列表
     */
    async getImages(options = {}) {
        try {
            const {
                basename = null,
                limit = 100,
                offset = 0
            } = options;

            let sql = 'SELECT * FROM imagesbase';
            const params = [];

            if (basename) {
                sql += ' WHERE basename = ?';
                params.push(basename);
            }

            // MySQL 不支持在 LIMIT 和 OFFSET 中使用占位符，需要确保是整数后直接拼接
            const safeLimit = parseInt(limit) || 100;
            const safeOffset = parseInt(offset) || 0;
            sql += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('[DB] 查询图片记录失败:', error);
            throw error;
        }
    }

    /**
     * 关闭数据库连接池
     */
    async close() {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                logger.info('[DB] 数据库连接池已关闭');
            }
        } catch (error) {
            logger.error('[DB] 关闭数据库连接池失败:', error);
            throw error;
        }
    }
}

// 导出单例
const database = new Database();

module.exports = database;
