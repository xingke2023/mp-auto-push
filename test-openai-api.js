#!/usr/bin/env node

/**
 * OpenAI API 测试脚本
 *
 * 测试 OpenAI Chat Completions API 的各种功能
 */

const axios = require('axios');

// 从环境变量读取配置
require('dotenv-expand').expand(require('dotenv').config({ override: true }));

const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';
const API_URL = 'http://localhost:5003/api/openai/chat';

console.log('='.repeat(80));
console.log('OpenAI API 测试');
console.log('='.repeat(80));
console.log();

/**
 * 测试1: 使用服务器配置的 API Key（非流式）
 */
async function test1() {
    console.log('【测试1】使用服务器 API Key（非流式）');
    console.log('-'.repeat(80));

    try {
        const response = await axios.post(API_URL, {
            messages: [
                { role: 'user', content: '你好，请简单介绍一下你自己。' }
            ],
            temperature: 0.7,
            maxTokens: 100
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 测试通过');
        console.log('响应:', response.data.data.message);
        console.log('Token 使用:', response.data.data.usage);
        console.log();

    } catch (error) {
        console.log('❌ 测试失败');
        console.log('错误:', error.response?.data || error.message);
        console.log();
    }
}

/**
 * 测试2: 使用客户端提供的 API Key（非流式）
 */
async function test2() {
    console.log('【测试2】使用客户端 API Key（非流式）');
    console.log('-'.repeat(80));

    // 如果没有配置客户端 API Key，跳过测试
    const clientApiKey = process.env.OPENAI_API_KEY;
    if (!clientApiKey || clientApiKey === 'your_openai_api_key_here') {
        console.log('⚠️  跳过测试: 未配置 OPENAI_API_KEY');
        console.log();
        return;
    }

    try {
        const response = await axios.post(API_URL, {
            messages: [
                { role: 'user', content: '什么是人工智能？' }
            ],
            temperature: 0.7,
            maxTokens: 50,
            openaiApiKey: clientApiKey
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 测试通过');
        console.log('响应:', response.data.data.message);
        console.log('Token 使用:', response.data.data.usage);
        console.log();

    } catch (error) {
        console.log('❌ 测试失败');
        console.log('错误:', error.response?.data || error.message);
        console.log();
    }
}

/**
 * 测试3: 参数验证测试
 */
async function test3() {
    console.log('【测试3】参数验证');
    console.log('-'.repeat(80));

    try {
        const response = await axios.post(API_URL, {
            // 故意不传 messages 参数
            temperature: 0.7
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('❌ 测试失败: 应该返回参数错误');
        console.log();

    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ 测试通过: 参数验证正常工作');
            console.log('错误信息:', error.response.data.message);
            console.log();
        } else {
            console.log('❌ 测试失败');
            console.log('错误:', error.response?.data || error.message);
            console.log();
        }
    }
}

/**
 * 测试4: 多轮对话（非流式）
 */
async function test4() {
    console.log('【测试4】多轮对话（非流式）');
    console.log('-'.repeat(80));

    try {
        const response = await axios.post(API_URL, {
            messages: [
                { role: 'system', content: '你是一个有帮助的助手。' },
                { role: 'user', content: '我叫张三。' },
                { role: 'assistant', content: '你好张三！很高兴认识你。' },
                { role: 'user', content: '你知道我叫什么名字吗？' }
            ],
            temperature: 0.8,
            maxTokens: 200
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 测试通过');
        console.log('响应:', response.data.data.message);
        console.log('Token 使用:', response.data.data.usage);
        console.log();

    } catch (error) {
        console.log('❌ 测试失败');
        console.log('错误:', error.response?.data || error.message);
        console.log();
    }
}

/**
 * 测试5: 流式响应测试
 */
async function test5() {
    console.log('【测试5】流式响应');
    console.log('-'.repeat(80));

    try {
        const response = await axios.post(API_URL, {
            messages: [
                { role: 'user', content: '请简要介绍一下 Node.js。' }
            ],
            temperature: 0.7,
            maxTokens: 500,
            stream: true
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 60000
        });

        console.log('✅ 流式响应开始接收数据:');
        console.log();

        let fullContent = '';
        let chunkCount = 0;

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);

                    if (data === '[DONE]') {
                        console.log();
                        console.log();
                        console.log('流式响应完成');
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.choices && parsed.choices[0].delta.content) {
                            const content = parsed.choices[0].delta.content;
                            process.stdout.write(content);
                            fullContent += content;
                            chunkCount++;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log();
            console.log();
            console.log('流式响应统计:');
            console.log('- 接收到的数据块数:', chunkCount);
            console.log('- 总字符数:', fullContent.length);
            console.log();
        });

        response.data.on('error', (error) => {
            console.log();
            console.log('❌ 流式响应错误:', error.message);
            console.log();
        });

        // 等待流式响应完成
        await new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

    } catch (error) {
        console.log('❌ 测试失败');
        console.log('错误:', error.response?.data || error.message);
        console.log();
    }
}

/**
 * 测试6: 使用不同参数格式（下划线命名）
 */
async function test6() {
    console.log('【测试6】参数格式兼容性（下划线命名）');
    console.log('-'.repeat(80));

    try {
        const response = await axios.post(API_URL, {
            messages: [
                { role: 'user', content: '说一个冷笑话。' }
            ],
            temperature: 0.9,
            max_tokens: 100,  // 使用下划线命名
            top_p: 0.95,
            frequency_penalty: 0.5,
            presence_penalty: 0.5
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 测试通过（下划线命名参数正常工作）');
        console.log('响应:', response.data.data.message);
        console.log();

    } catch (error) {
        console.log('❌ 测试失败');
        console.log('错误:', error.response?.data || error.message);
        console.log();
    }
}

/**
 * 测试7: 测试标准 OpenAI 格式路径
 */
async function test7() {
    console.log('【测试7】标准 OpenAI API 路径');
    console.log('-'.repeat(80));

    const standardUrl = 'http://localhost:5003/v1/chat/completions';

    try {
        const response = await axios.post(standardUrl, {
            messages: [
                { role: 'user', content: 'Hi!' }
            ],
            max_tokens: 50
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 测试通过（标准路径 /v1/chat/completions 可用）');
        console.log('响应:', response.data.data.message);
        console.log();

    } catch (error) {
        console.log('❌ 测试失败');
        console.log('错误:', error.response?.data || error.message);
        console.log();
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    await test1();
    await test2();
    await test3();
    await test4();
    await test5();
    await test6();
    await test7();

    console.log('='.repeat(80));
    console.log('所有测试完成！');
    console.log('='.repeat(80));
}

// 运行测试
runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});
