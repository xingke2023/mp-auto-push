/**
 * 单词词典查询测试脚本
 */

const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:5003';
const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';

// 创建 axios 实例
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'X-API-Key': API_KEY
    }
});

/**
 * 测试单词查询
 */
async function testWordQuery(word, to = 'zh-cn') {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`查询单词: "${word}" -> ${to}`);
    console.log('='.repeat(60));

    try {
        const response = await api.post('/api/translate', {
            text: word,
            to: to
        });

        if (response.data.success) {
            const data = response.data.data;

            console.log('\n✅ 查询成功\n');

            // 基本翻译
            console.log(`📝 单词: ${data.originalText}`);
            console.log(`🔤 翻译: ${data.translatedText}`);
            console.log(`🌍 检测语言: ${data.detectedLanguage}`);

            // 如果有词典信息
            if (data.dictionary) {
                const dict = data.dictionary;

                // 所有翻译
                if (dict.translations && dict.translations.length > 0) {
                    console.log('\n📖 翻译列表:');
                    dict.translations.forEach((trans, index) => {
                        const pos = trans.partOfSpeech ? `[${trans.partOfSpeech}]` : '';
                        console.log(`  ${index + 1}. ${trans.text} ${pos}`);
                    });
                }

                // 定义（按词性）
                if (dict.definitions && dict.definitions.length > 0) {
                    console.log('\n📚 详细释义:');
                    const groupedDefs = {};
                    dict.definitions.forEach(def => {
                        if (!groupedDefs[def.partOfSpeech]) {
                            groupedDefs[def.partOfSpeech] = [];
                        }
                        groupedDefs[def.partOfSpeech].push(def);
                    });

                    Object.keys(groupedDefs).forEach(pos => {
                        console.log(`\n  【${pos}】`);
                        groupedDefs[pos].forEach((def, index) => {
                            console.log(`    ${index + 1}. ${def.meaning}`);
                            if (def.synonyms && def.synonyms.length > 0) {
                                console.log(`       同义词: ${def.synonyms.join(', ')}`);
                            }
                        });
                    });
                }

                // 例句
                if (dict.examples && dict.examples.length > 0) {
                    console.log('\n💡 例句:');
                    dict.examples.forEach((example, index) => {
                        console.log(`\n  ${index + 1}. ${example.source}`);
                        if (example.translation) {
                            console.log(`     ${example.translation}`);
                        }
                    });
                }

                // 同义词
                if (dict.synonyms && dict.synonyms.length > 0) {
                    console.log('\n🔗 同义词:');
                    dict.synonyms.forEach(synGroup => {
                        if (synGroup.words && synGroup.words.length > 0) {
                            const pos = synGroup.partOfSpeech ? `[${synGroup.partOfSpeech}]` : '';
                            console.log(`  ${pos} ${synGroup.words.join(', ')}`);
                        }
                    });
                }
            } else {
                console.log('\n⚠️  未获取到词典详细信息');
            }

        } else {
            console.log('❌ 查询失败:', response.data.message);
        }

    } catch (error) {
        console.error('❌ 请求错误:', error.response?.data || error.message);
    }
}

/**
 * 测试短语（应该返回普通翻译）
 */
async function testPhrase(text, to = 'zh-cn') {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`翻译短语: "${text}" -> ${to}`);
    console.log('='.repeat(60));

    try {
        const response = await api.post('/api/translate', {
            text: text,
            to: to
        });

        if (response.data.success) {
            const data = response.data.data;

            console.log('\n✅ 翻译成功\n');
            console.log(`原文: ${data.originalText}`);
            console.log(`译文: ${data.translatedText}`);

            if (data.dictionary) {
                console.log('\n⚠️  意外获取到词典信息（短语不应触发词典模式）');
            } else {
                console.log('\n✓ 正确：短语模式，无词典信息');
            }

        } else {
            console.log('❌ 翻译失败:', response.data.message);
        }

    } catch (error) {
        console.error('❌ 请求错误:', error.response?.data || error.message);
    }
}

/**
 * 主测试函数
 */
async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('  单词词典查询功能测试');
    console.log('='.repeat(60));
    console.log(`API: ${API_BASE_URL}`);
    console.log(`Key: ${API_KEY ? '已设置' : '未设置'}`);

    // 测试英文单词
    await testWordQuery('hello', 'zh-cn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testWordQuery('beautiful', 'zh-cn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testWordQuery('run', 'zh-cn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testWordQuery('apple', 'zh-cn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试带连字符的单词
    await testWordQuery('well-known', 'zh-cn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试短语（不应触发词典模式）
    await testPhrase('hello world', 'zh-cn');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testPhrase('How are you?', 'zh-cn');

    console.log('\n' + '='.repeat(60));
    console.log('  测试完成');
    console.log('='.repeat(60) + '\n');
}

// 运行测试
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testWordQuery, testPhrase };
