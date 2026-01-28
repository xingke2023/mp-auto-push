const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Paddle OCR API 测试脚本
 * 用于测试 PDF 和图片的 OCR 识别功能
 */

// API 配置
const API_URL = 'http://localhost:5003';
const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';

// Paddle OCR 配置（可选，如果服务器已配置则不需要）
const PADDLE_OCR_API_URL = process.env.PADDLE_OCR_API_URL || 'https://u8yeibc471q3e274.aistudio-app.com/ocr';
const PADDLE_OCR_TOKEN = process.env.PADDLE_OCR_TOKEN || '764a4d3e03c87b2e07c30324d3a678113e3c5bdf';

/**
 * 测试 PDF 识别
 */
async function testPDFRecognition() {
    console.log('\n========== 测试 PDF 识别 ==========\n');

    // 请替换为实际的 PDF 文件路径
    const pdfPath = './test.pdf';

    if (!fs.existsSync(pdfPath)) {
        console.log(`❌ 文件不存在: ${pdfPath}`);
        console.log('请将测试 PDF 文件放在项目根目录下，命名为 test.pdf');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(pdfPath));
        formData.append('useDocOrientationClassify', 'false');
        formData.append('useDocUnwarping', 'false');
        formData.append('useTextlineOrientation', 'false');
        formData.append('saveImages', 'true'); // 保存识别结果图片

        // 如果需要使用客户端提供的配置，取消下面两行注释
        // formData.append('paddleApiUrl', PADDLE_OCR_API_URL);
        // formData.append('paddleToken', PADDLE_OCR_TOKEN);

        console.log('📤 发送 PDF 识别请求...');

        const response = await axios.post(
            `${API_URL}/api/paddle-ocr/pdf`,
            formData,
            {
                headers: {
                    'X-API-Key': API_KEY,
                    ...formData.getHeaders()
                },
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024
            }
        );

        console.log('✅ PDF 识别成功！\n');
        console.log('识别结果:');
        console.log(`  - 总页数: ${response.data.data.totalPages}`);
        console.log(`  - 状态: ${response.data.success ? '成功' : '失败'}`);

        // 打印每一页的识别文本
        response.data.data.results.forEach((result, index) => {
            console.log(`\n--- 第 ${index + 1} 页 ---`);
            console.log(result.text);
        });

        // 如果保存了图片，显示保存路径
        if (response.data.data.savedImages && response.data.data.savedImages.length > 0) {
            console.log('\n📁 保存的图片:');
            response.data.data.savedImages.forEach(img => {
                console.log(`  - ${img.path}`);
            });
        }

        return response.data;

    } catch (error) {
        console.error('❌ PDF 识别失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试图片识别
 */
async function testImageRecognition() {
    console.log('\n========== 测试图片识别 ==========\n');

    // 请替换为实际的图片文件路径
    const imagePath = './test.jpg';

    if (!fs.existsSync(imagePath)) {
        console.log(`❌ 文件不存在: ${imagePath}`);
        console.log('请将测试图片文件放在项目根目录下，命名为 test.jpg');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(imagePath));
        formData.append('useDocOrientationClassify', 'false');
        formData.append('useDocUnwarping', 'false');
        formData.append('useTextlineOrientation', 'false');
        formData.append('saveImages', 'true');

        // 如果需要使用客户端提供的配置，取消下面两行注释
        // formData.append('paddleApiUrl', PADDLE_OCR_API_URL);
        // formData.append('paddleToken', PADDLE_OCR_TOKEN);

        console.log('📤 发送图片识别请求...');

        const response = await axios.post(
            `${API_URL}/api/paddle-ocr/image`,
            formData,
            {
                headers: {
                    'X-API-Key': API_KEY,
                    ...formData.getHeaders()
                }
            }
        );

        console.log('✅ 图片识别成功！\n');
        console.log('识别结果:');
        console.log(`  - 识别区域数: ${response.data.data.totalPages}`);
        console.log(`  - 状态: ${response.data.success ? '成功' : '失败'}`);

        // 打印识别文本
        response.data.data.results.forEach((result, index) => {
            console.log(`\n--- 区域 ${index + 1} ---`);
            console.log(result.text);
        });

        // 如果保存了图片，显示保存路径
        if (response.data.data.savedImages && response.data.data.savedImages.length > 0) {
            console.log('\n📁 保存的图片:');
            response.data.data.savedImages.forEach(img => {
                console.log(`  - ${img.path}`);
            });
        }

        return response.data;

    } catch (error) {
        console.error('❌ 图片识别失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试批量识别
 */
async function testBatchRecognition() {
    console.log('\n========== 测试批量识别 ==========\n');

    // 请替换为实际的文件路径
    const files = [
        './test1.pdf',
        './test2.jpg'
    ];

    // 过滤存在的文件
    const existingFiles = files.filter(file => {
        const exists = fs.existsSync(file);
        if (!exists) {
            console.log(`⚠️  文件不存在，跳过: ${file}`);
        }
        return exists;
    });

    if (existingFiles.length === 0) {
        console.log('❌ 没有可用的文件进行批量识别');
        console.log('请将测试文件放在项目根目录下');
        return;
    }

    try {
        const formData = new FormData();

        // 添加所有文件
        existingFiles.forEach(file => {
            formData.append('files', fs.createReadStream(file));
        });

        formData.append('useDocOrientationClassify', 'false');
        formData.append('useDocUnwarping', 'false');
        formData.append('useTextlineOrientation', 'false');
        formData.append('saveImages', 'true');

        // 如果需要使用客户端提供的配置，取消下面两行注释
        // formData.append('paddleApiUrl', PADDLE_OCR_API_URL);
        // formData.append('paddleToken', PADDLE_OCR_TOKEN);

        console.log(`📤 发送批量识别请求 - 文件数量: ${existingFiles.length}...\n`);

        const response = await axios.post(
            `${API_URL}/api/paddle-ocr/batch`,
            formData,
            {
                headers: {
                    'X-API-Key': API_KEY,
                    ...formData.getHeaders()
                },
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024,
                timeout: 300000 // 5 分钟超时
            }
        );

        console.log('✅ 批量识别完成！\n');
        console.log('识别结果:');
        console.log(`  - 总文件数: ${response.data.data.totalFiles}`);
        console.log(`  - 成功: ${response.data.data.successCount}`);
        console.log(`  - 失败: ${response.data.data.failedCount}`);

        // 打印每个文件的识别结果
        response.data.data.results.forEach((result, index) => {
            console.log(`\n--- 文件 ${index + 1}: ${result.filename} ---`);
            if (result.success) {
                console.log(`状态: ✅ 成功`);
                console.log(`页数/区域数: ${result.totalPages}`);
                result.results.forEach((page, pageIndex) => {
                    console.log(`\n  页面/区域 ${pageIndex + 1}:`);
                    console.log(`  ${page.text.substring(0, 200)}${page.text.length > 200 ? '...' : ''}`);
                });
            } else {
                console.log(`状态: ❌ 失败 - ${result.error}`);
            }
        });

        return response.data;

    } catch (error) {
        console.error('❌ 批量识别失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('========================================');
    console.log('  Paddle OCR API 测试');
    console.log('========================================');
    console.log(`API URL: ${API_URL}`);
    console.log(`API Key: ${API_KEY ? '已配置' : '未配置'}`);
    console.log('========================================');

    const args = process.argv.slice(2);
    const testType = args[0] || 'all';

    try {
        switch (testType) {
            case 'pdf':
                await testPDFRecognition();
                break;
            case 'image':
                await testImageRecognition();
                break;
            case 'batch':
                await testBatchRecognition();
                break;
            case 'all':
            default:
                await testPDFRecognition();
                await testImageRecognition();
                await testBatchRecognition();
                break;
        }

        console.log('\n========================================');
        console.log('✅ 测试完成！');
        console.log('========================================\n');

    } catch (error) {
        console.log('\n========================================');
        console.log('❌ 测试失败！');
        console.log('========================================\n');
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = {
    testPDFRecognition,
    testImageRecognition,
    testBatchRecognition
};
