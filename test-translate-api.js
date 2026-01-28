/**
 * 翻译 API 测试脚本
 * 测试 Google Translate API 的各项功能
 */

const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:5003';
const API_KEY = process.env.API_KEY || ''; // 如果设置了 API_KEY，需要在这里提供

// 创建 axios 实例
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: API_KEY ? {
        'X-API-Key': API_KEY
    } : {}
});

/**
 * 测试 1: 单个文本翻译（自动检测语言 -> 英语）
 */
async function test1_autoTranslate() {
    console.log('\n========== 测试 1: 自动检测语言翻译 ==========');
    try {
        const response = await api.post('/api/translate', {
            text: '你好，世界！这是一个测试。',
            to: 'en'
        });

        console.log('✅ 测试成功');
        console.log('原文:', response.data.data.originalText);
        console.log('译文:', response.data.data.translatedText);
        console.log('检测语言:', response.data.data.detectedLanguage);
        console.log('目标语言:', response.data.data.targetLanguage);
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

/**
 * 测试 2: 指定源语言和目标语言翻译
 */
async function test2_specificLanguages() {
    console.log('\n========== 测试 2: 指定语言翻译（中文 -> 日语）==========');
    try {
        const response = await api.post('/api/translate', {
            text: '今天天气真好，我们一起去公园散步吧。',
            from: 'zh-cn',
            to: 'ja'
        });

        console.log('✅ 测试成功');
        console.log('原文:', response.data.data.originalText);
        console.log('译文:', response.data.data.translatedText);
        console.log('检测语言:', response.data.data.detectedLanguage);
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

/**
 * 测试 3: 英文到中文翻译
 */
async function test3_englishToChinese() {
    console.log('\n========== 测试 3: 英文翻译为中文 ==========');
    try {
        const response = await api.post('/api/translate', {
            text: 'Hello, how are you today? I hope you are doing well.',
            from: 'en',
            to: 'zh-cn'
        });

        console.log('✅ 测试成功');
        console.log('原文:', response.data.data.originalText);
        console.log('译文:', response.data.data.translatedText);
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

/**
 * 测试 4: 批量翻译
 */
async function test4_batchTranslate() {
    console.log('\n========== 测试 4: 批量翻译 ==========');
    try {
        const response = await api.post('/api/translate/batch', {
            texts: [
                '早上好',
                '下午好',
                '晚上好',
                '再见',
                '谢谢你'
            ],
            from: 'zh-cn',
            to: 'en'
        });

        console.log('✅ 测试成功');
        console.log('总数:', response.data.data.totalCount);
        console.log('成功:', response.data.data.successCount);
        console.log('失败:', response.data.data.failedCount);
        console.log('\n翻译结果:');
        response.data.data.results.forEach((result, index) => {
            if (result.success) {
                console.log(`  ${index + 1}. ${result.original} -> ${result.translated} (${result.detectedLanguage})`);
            } else {
                console.log(`  ${index + 1}. ${result.original} -> 失败: ${result.error}`);
            }
        });
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

/**
 * 测试 5: 获取支持的语言列表
 */
async function test5_getLanguages() {
    console.log('\n========== 测试 5: 获取支持的语言列表 ==========');
    try {
        const response = await api.get('/api/translate/languages');

        console.log('✅ 测试成功');
        console.log('支持的语言总数:', response.data.data.totalCount);
        console.log('\n部分语言列表:');
        const languages = response.data.data.languages;
        const entries = Object.entries(languages).slice(0, 10);
        entries.forEach(([code, name]) => {
            console.log(`  ${code}: ${name}`);
        });
        console.log('  ...');
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

/**
 * 测试 6: 长文本翻译
 */
async function test6_longText() {
    console.log('\n========== 测试 6: 长文本翻译 ==========');
    try {
        const longText = `
人工智能（AI）是计算机科学的一个分支，它企图了解智能的实质，
并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。
自从人工智能诞生以来，理论和技术日益成熟，应用领域也不断扩大。
可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。
        `.trim();

        const response = await api.post('/api/translate', {
            text: longText,
            from: 'zh-cn',
            to: 'en'
        });

        console.log('✅ 测试成功');
        console.log('原文长度:', response.data.data.originalText.length);
        console.log('译文长度:', response.data.data.translatedText.length);
        console.log('\n译文:');
        console.log(response.data.data.translatedText);
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

/**
 * 测试 7: 错误处理 - 空文本
 */
async function test7_emptyText() {
    console.log('\n========== 测试 7: 错误处理 - 空文本 ==========');
    try {
        const response = await api.post('/api/translate', {
            text: '',
            to: 'en'
        });
        console.log('❌ 应该返回错误，但测试通过了');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ 测试成功 - 正确返回 400 错误');
            console.log('错误消息:', error.response.data.message);
        } else {
            console.error('❌ 测试失败:', error.response?.data || error.message);
        }
    }
}

/**
 * 测试 8: 错误处理 - 不支持的语言
 */
async function test8_unsupportedLanguage() {
    console.log('\n========== 测试 8: 错误处理 - 不支持的语言 ==========');
    try {
        const response = await api.post('/api/translate', {
            text: 'Hello',
            from: 'invalid-lang',
            to: 'en'
        });
        console.log('❌ 应该返回错误，但测试通过了');
    } catch (error) {
        if (error.response?.status === 500) {
            console.log('✅ 测试成功 - 正确返回错误');
            console.log('错误消息:', error.response.data.message);
        } else {
            console.error('❌ 测试失败:', error.response?.data || error.message);
        }
    }
}

/**
 * 主测试函数
 */
async function runAllTests() {
    console.log('===========================================');
    console.log('   Google Translate API 功能测试');
    console.log('===========================================');
    console.log('API 地址:', API_BASE_URL);
    console.log('API Key:', API_KEY ? '已设置' : '未设置（开发模式）');

    try {
        // 依次运行所有测试
        await test1_autoTranslate();
        await test2_specificLanguages();
        await test3_englishToChinese();
        await test4_batchTranslate();
        await test5_getLanguages();
        await test6_longText();
        await test7_emptyText();
        await test8_unsupportedLanguage();

        console.log('\n===========================================');
        console.log('   所有测试完成！');
        console.log('===========================================\n');
    } catch (error) {
        console.error('\n测试过程中发生错误:', error.message);
    }
}

// 运行测试
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };
