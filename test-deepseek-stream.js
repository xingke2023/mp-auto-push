const axios = require('axios');

// 配置
const API_URL = 'http://localhost:5003';
const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';

/**
 * 测试 DeepSeek Chat API 流式响应
 */
async function testDeepSeekStream() {
    console.log('\n=== 测试 DeepSeek Stream API ===\n');

    try {
        console.log('测试: 流式响应（SSE）...\n');

        const response = await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                messages: [
                    { role: 'system', content: '你是一个专业的AI助手，回答简洁明了。' },
                    { role: 'user', content: '请用三句话介绍一下人工智能的发展历史。' }
                ],
                temperature: 0.7,
                maxTokens: 500,
                stream: true  // 开启流式响应
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                responseType: 'stream'
            }
        );

        console.log('✅ 流式连接建立成功，开始接收数据...\n');
        console.log('--- 流式输出 ---');

        let fullMessage = '';
        let chunkCount = 0;

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();

                    // 跳过 [DONE] 标记
                    if (data === '[DONE]') {
                        console.log('\n\n--- 流式输出结束 ---\n');
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                            const content = parsed.choices[0].delta.content || '';
                            if (content) {
                                process.stdout.write(content);
                                fullMessage += content;
                                chunkCount++;
                            }
                        }

                        // 如果有错误
                        if (parsed.error) {
                            console.error('\n\n❌ 错误:', parsed.error);
                        }

                    } catch (e) {
                        // 忽略无法解析的行
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log(`\n\n✅ 流式响应完成!`);
            console.log(`\n统计信息:`);
            console.log(`- 总字符数: ${fullMessage.length}`);
            console.log(`- 数据块数: ${chunkCount}`);
            console.log(`- 完整消息:\n${fullMessage}\n`);
        });

        response.data.on('error', (error) => {
            console.error('❌ 流式错误:', error.message);
        });

    } catch (error) {
        console.error('❌ 测试失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else {
            console.error('错误:', error.message);
        }
    }
}

/**
 * 测试非流式和流式对比
 */
async function testStreamVsNonStream() {
    console.log('\n=== 对比测试：非流式 vs 流式 ===\n');

    const testMessages = [
        { role: 'user', content: '简单介绍一下什么是机器学习。' }
    ];

    // 测试 1: 非流式
    console.log('测试 1: 非流式响应...');
    const startTime1 = Date.now();

    try {
        const response1 = await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                messages: testMessages,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                }
            }
        );

        const duration1 = Date.now() - startTime1;
        console.log('✅ 非流式响应成功');
        console.log('耗时:', duration1, 'ms');
        console.log('消息长度:', response1.data.data.message.length);
        console.log('消息内容:', response1.data.data.message);
        console.log('');

    } catch (error) {
        console.error('❌ 非流式测试失败:', error.message);
    }

    // 测试 2: 流式
    console.log('测试 2: 流式响应...');
    const startTime2 = Date.now();

    try {
        const response2 = await axios.post(
            `${API_URL}/api/deepseek/chat`,
            {
                messages: testMessages,
                stream: true
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                responseType: 'stream'
            }
        );

        let fullMessage = '';
        let firstChunkTime = 0;

        response2.data.on('data', (chunk) => {
            if (firstChunkTime === 0) {
                firstChunkTime = Date.now() - startTime2;
            }

            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();
                    if (data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            fullMessage += content;
                        } catch (e) {}
                    }
                }
            }
        });

        response2.data.on('end', () => {
            const duration2 = Date.now() - startTime2;
            console.log('✅ 流式响应成功');
            console.log('总耗时:', duration2, 'ms');
            console.log('首字节耗时:', firstChunkTime, 'ms');
            console.log('消息长度:', fullMessage.length);
            console.log('消息内容:', fullMessage);
            console.log('');
        });

    } catch (error) {
        console.error('❌ 流式测试失败:', error.message);
    }
}

// 主函数
async function main() {
    const testType = process.argv[2] || 'stream';

    if (testType === 'stream') {
        await testDeepSeekStream();
    } else if (testType === 'compare') {
        await testStreamVsNonStream();
    } else {
        console.log('用法:');
        console.log('  node test-deepseek-stream.js stream   - 测试流式响应');
        console.log('  node test-deepseek-stream.js compare  - 对比流式和非流式');
    }
}

// 运行测试
main().catch(error => {
    console.error('测试运行失败:', error.message);
    process.exit(1);
});
