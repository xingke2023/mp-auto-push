/**
 * 测试 google-translate-api 库
 */

const translate = require('./google-translate-api/index.js');

async function test() {
    try {
        console.log('测试 google-translate-api 库...\n');

        // 测试 1: 中文翻译为英文
        console.log('测试 1: 中文 -> 英文');
        const result1 = await translate('你好，世界！', { from: 'zh-cn', to: 'en' });
        console.log('原文:', '你好，世界！');
        console.log('译文:', result1.text);
        console.log('检测语言:', result1.from.language.iso);
        console.log('');

        // 测试 2: 英文翻译为中文
        console.log('测试 2: 英文 -> 中文');
        const result2 = await translate('Hello, how are you?', { from: 'en', to: 'zh-cn' });
        console.log('原文:', 'Hello, how are you?');
        console.log('译文:', result2.text);
        console.log('检测语言:', result2.from.language.iso);
        console.log('');

        console.log('✅ 所有测试通过！google-translate-api 库工作正常。');
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

test();
