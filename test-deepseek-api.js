const axios = require('axios');

// 配置
const API_URL = 'http://localhost:5003';
const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';

/**
 * 测试 DeepSeek Chat API
 */
async function testDeepSeekChat() {
    console.log('\n=== 测试 DeepSeek Chat API ===\n');

    try {
        // 测试案例 1: 使用服务器 API Key
        console.log('测试 1: 使用服务器 API Key...');
        const response1 = await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                messages: [
                    { role: 'system', content: '你是一个专业的AI助手，回答简洁明了。' },
                    { role: 'user', content: '请用一句话介绍什么是人工智能。' }
                ],
                temperature: 0.7,
                maxTokens: 100
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                }
            }
        );

        console.log('✅ 测试 1 成功!');
        console.log('响应消息:', response1.data.data.message);
        console.log('Token 使用:', response1.data.data.usage);
        console.log('模型:', response1.data.data.model);

    } catch (error) {
        console.error('❌ 测试 1 失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else {
            console.error('错误:', error.message);
        }
    }

    try {
        // 测试案例 2: 使用客户端提供的 API Key（需要替换为有效的 key）
        console.log('\n测试 2: 使用客户端 API Key（需要有效的 DeepSeek API Key）...');
        const clientApiKey = process.env.DEEPSEEK_API_KEY || '';

        if (!clientApiKey) {
            console.log('⚠️  跳过测试 2: 未设置 DEEPSEEK_API_KEY 环境变量');
            return;
        }

        const response2 = await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                messages: [
                    { role: 'user', content: '用简短的一句话回答：什么是深度学习？' }
                ],
                deepseekApiKey: clientApiKey,
                maxTokens: 50
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                }
            }
        );

        console.log('✅ 测试 2 成功!');
        console.log('响应消息:', response2.data.data.message);
        console.log('Token 使用:', response2.data.data.usage);

    } catch (error) {
        console.error('❌ 测试 2 失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else {
            console.error('错误:', error.message);
        }
    }

    try {
        // 测试案例 3: 参数验证测试
        console.log('\n测试 3: 参数验证（缺少 messages 参数）...');
        await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                temperature: 0.7
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                }
            }
        );

        console.log('❌ 测试 3 失败: 应该返回参数错误');

    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log('✅ 测试 3 成功: 正确返回参数错误');
            console.log('错误信息:', error.response.data.message);
        } else {
            console.error('❌ 测试 3 失败: 未预期的错误');
            console.error('错误:', error.message);
        }
    }

    try {
        // 测试案例 4: 多轮对话测试
        console.log('\n测试 4: 多轮对话（使用 8000 max tokens）...');
        const response4 = await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                messages: [
                    { role: 'system', content: '你是一个友好的AI助手。' },
                    { role: 'user', content: '你好！' },
                    { role: 'assistant', content: '你好！很高兴见到你。有什么我可以帮助的吗？' },
                    { role: 'user', content: '请简单介绍一下你自己。' }
                ],
                temperature: 0.8,
                maxTokens: 200  // 测试自定义 max tokens（默认是 8000）
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                }
            }
        );

        console.log('✅ 测试 4 成功!');
        console.log('响应消息:', response4.data.data.message);
        console.log('Token 使用:', response4.data.data.usage);

    } catch (error) {
        console.error('❌ 测试 4 失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else {
            console.error('错误:', error.message);
        }
    }

    console.log('\n=== 测试完成 ===\n');
}

// 运行测试
testDeepSeekChat().catch(error => {
    console.error('测试运行失败:', error.message);
    process.exit(1);
});
