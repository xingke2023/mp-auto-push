const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Paddle Layout API 测试脚本
 * 用于测试 PDF 和图片的布局解析功能（转换为 Markdown）
 */

// API 配置
const API_URL = 'http://localhost:5003';
const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';

/**
 * 测试 PDF 布局解析
 */
async function testPDFLayout() {
    console.log('\n========== 测试 PDF 布局解析 ==========\n');

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
        formData.append('useChartRecognition', 'false');
        formData.append('saveFiles', 'true'); // 保存 Markdown 和图片

        console.log('📤 发送 PDF 布局解析请求...');

        const response = await axios.post(
            `${API_URL}/api/paddle-layout/pdf`,
            formData,
            {
                headers: {
                    'X-API-Key': API_KEY,
                    ...formData.getHeaders()
                },
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024,
                timeout: 300000 // 5 分钟超时
            }
        );

        console.log('✅ PDF 布局解析成功！\n');
        console.log('解析结果:');
        console.log(`  - 总页数: ${response.data.data.totalPages}`);
        console.log(`  - 状态: ${response.data.success ? '成功' : '失败'}`);

        // 打印每一页的 Markdown 内容
        response.data.data.results.forEach((result, index) => {
            console.log(`\n--- 第 ${index + 1} 页 Markdown ---`);
            const markdownPreview = result.markdown.text.substring(0, 500);
            console.log(markdownPreview);
            if (result.markdown.text.length > 500) {
                console.log('... (内容过长，已截断)');
            }

            // 显示 Markdown 中引用的图片数量
            const imageCount = Object.keys(result.markdown.images || {}).length;
            if (imageCount > 0) {
                console.log(`\n  包含 ${imageCount} 张图片`);
            }
        });

        // 如果保存了文件，显示保存路径
        if (response.data.data.savedFiles && response.data.data.savedFiles.length > 0) {
            console.log('\n📁 保存的文件:');

            const mdFiles = response.data.data.savedFiles.filter(f => f.type === 'markdown');
            const mdImages = response.data.data.savedFiles.filter(f => f.type === 'markdown-image');
            const outputImages = response.data.data.savedFiles.filter(f => f.type === 'output-image');

            if (mdFiles.length > 0) {
                console.log(`\n  Markdown 文档 (${mdFiles.length} 个):`);
                mdFiles.forEach(f => console.log(`    - ${f.path}`));
            }

            if (mdImages.length > 0) {
                console.log(`\n  Markdown 图片 (${mdImages.length} 个):`);
                mdImages.forEach(f => console.log(`    - ${f.path}`));
            }

            if (outputImages.length > 0) {
                console.log(`\n  输出图片 (${outputImages.length} 个):`);
                outputImages.forEach(f => console.log(`    - ${f.path}`));
            }
        }

        return response.data;

    } catch (error) {
        console.error('❌ PDF 布局解析失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试图片布局解析
 */
async function testImageLayout() {
    console.log('\n========== 测试图片布局解析 ==========\n');

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
        formData.append('useChartRecognition', 'false');
        formData.append('saveFiles', 'true');

        console.log('📤 发送图片布局解析请求...');

        const response = await axios.post(
            `${API_URL}/api/paddle-layout/image`,
            formData,
            {
                headers: {
                    'X-API-Key': API_KEY,
                    ...formData.getHeaders()
                },
                timeout: 300000
            }
        );

        console.log('✅ 图片布局解析成功！\n');
        console.log('解析结果:');
        console.log(`  - 识别区域数: ${response.data.data.totalPages}`);
        console.log(`  - 状态: ${response.data.success ? '成功' : '失败'}`);

        // 打印 Markdown 内容
        response.data.data.results.forEach((result, index) => {
            console.log(`\n--- 区域 ${index + 1} Markdown ---`);
            const markdownPreview = result.markdown.text.substring(0, 500);
            console.log(markdownPreview);
            if (result.markdown.text.length > 500) {
                console.log('... (内容过长，已截断)');
            }
        });

        // 如果保存了文件，显示保存路径
        if (response.data.data.savedFiles && response.data.data.savedFiles.length > 0) {
            console.log('\n📁 保存的文件:');
            response.data.data.savedFiles.forEach(f => {
                console.log(`  - [${f.type}] ${f.path}`);
            });
        }

        return response.data;

    } catch (error) {
        console.error('❌ 图片布局解析失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试批量布局解析
 */
async function testBatchLayout() {
    console.log('\n========== 测试批量布局解析 ==========\n');

    const files = [
        './test1.pdf',
        './test2.jpg'
    ];

    const existingFiles = files.filter(file => {
        const exists = fs.existsSync(file);
        if (!exists) {
            console.log(`⚠️  文件不存在，跳过: ${file}`);
        }
        return exists;
    });

    if (existingFiles.length === 0) {
        console.log('❌ 没有可用的文件进行批量解析');
        console.log('请将测试文件放在项目根目录下');
        return;
    }

    try {
        const formData = new FormData();

        existingFiles.forEach(file => {
            formData.append('files', fs.createReadStream(file));
        });

        formData.append('useDocOrientationClassify', 'false');
        formData.append('useDocUnwarping', 'false');
        formData.append('useChartRecognition', 'false');
        formData.append('saveFiles', 'true');

        console.log(`📤 发送批量布局解析请求 - 文件数量: ${existingFiles.length}...\n`);

        const response = await axios.post(
            `${API_URL}/api/paddle-layout/batch`,
            formData,
            {
                headers: {
                    'X-API-Key': API_KEY,
                    ...formData.getHeaders()
                },
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024,
                timeout: 600000 // 10 分钟超时
            }
        );

        console.log('✅ 批量布局解析完成！\n');
        console.log('解析结果:');
        console.log(`  - 总文件数: ${response.data.data.totalFiles}`);
        console.log(`  - 成功: ${response.data.data.successCount}`);
        console.log(`  - 失败: ${response.data.data.failedCount}`);

        // 打印每个文件的解析结果
        response.data.data.results.forEach((result, index) => {
            console.log(`\n--- 文件 ${index + 1}: ${result.filename} ---`);
            if (result.success) {
                console.log(`状态: ✅ 成功`);
                console.log(`页数/区域数: ${result.totalPages}`);

                if (result.results && result.results[0]) {
                    const preview = result.results[0].markdown.text.substring(0, 200);
                    console.log(`\n  首页 Markdown 预览:`);
                    console.log(`  ${preview}${result.results[0].markdown.text.length > 200 ? '...' : ''}`);
                }

                if (result.savedFiles && result.savedFiles.length > 0) {
                    console.log(`\n  保存了 ${result.savedFiles.length} 个文件`);
                }
            } else {
                console.log(`状态: ❌ 失败 - ${result.error}`);
            }
        });

        return response.data;

    } catch (error) {
        console.error('❌ 批量布局解析失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('========================================');
    console.log('  Paddle Layout API 测试');
    console.log('  (PDF/图片转 Markdown 布局解析)');
    console.log('========================================');
    console.log(`API URL: ${API_URL}`);
    console.log(`API Key: ${API_KEY ? '已配置' : '未配置'}`);
    console.log('========================================');

    const args = process.argv.slice(2);
    const testType = args[0] || 'all';

    try {
        switch (testType) {
            case 'pdf':
                await testPDFLayout();
                break;
            case 'image':
                await testImageLayout();
                break;
            case 'batch':
                await testBatchLayout();
                break;
            case 'all':
            default:
                await testPDFLayout();
                await testImageLayout();
                await testBatchLayout();
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
    testPDFLayout,
    testImageLayout,
    testBatchLayout
};
