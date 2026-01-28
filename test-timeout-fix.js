#!/usr/bin/env node

/**
 * DeepSeek API 超时修复验证测试
 *
 * 测试长时间运行的请求是否能够正常完成（不再在60秒后中断）
 */

const axios = require('axios');

// 从环境变量读取配置
require('dotenv-expand').expand(require('dotenv').config({ override: true }));

const API_KEY = process.env.API_KEY || '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647';
const API_URL = 'http://localhost:5003/api/deepseek/chat';

console.log('='.repeat(80));
console.log('DeepSeek API 超时修复验证测试');
console.log('='.repeat(80));
console.log();

/**
 * 测试长内容生成（可能超过60秒）
 */
async function testLongContent() {
    console.log('【测试1】长内容生成（maxTokens=8000）');
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
        console.log('开始时间:', new Date().toLocaleString());
        console.log('发送请求...');

        const response = await axios.post(API_URL, {
            messages: [
                {
                    role: 'user',
                    content: '请详细介绍人工智能的发展历史，包括：1) 早期探索阶段（1950-1970）2) 第一次AI寒冬（1970-1980）3) 专家系统时代（1980-1990）4) 第二次AI寒冬（1990-2000）5) 机器学习复兴（2000-2010）6) 深度学习革命（2010-2020）7) 大模型时代（2020-至今）。每个阶段都要详细说明关键技术突破、代表性人物和重要事件。'
                }
            ],
            maxTokens: 8000,
            temperature: 0.7,
            stream: false
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 350000 // 客户端超时设置为350秒，略长于服务器的300秒
        });

        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        console.log('✅ 请求成功完成');
        console.log('结束时间:', new Date().toLocaleString());
        console.log('耗时:', duration, '秒');
        console.log();
        console.log('响应长度:', response.data.data.message.length, '字符');
        console.log('Token 使用:');
        console.log('  - Prompt tokens:', response.data.data.usage.promptTokens);
        console.log('  - Completion tokens:', response.data.data.usage.completionTokens);
        console.log('  - Total tokens:', response.data.data.usage.totalTokens);
        console.log();
        console.log('响应内容预览（前500字）:');
        console.log(response.data.data.message.substring(0, 500));
        console.log('...');
        console.log();

        if (duration > 60) {
            console.log('🎉 验证成功！请求耗时超过60秒但没有被中断');
            console.log('   之前会在60秒时出现 "aborted" 错误，现在已修复');
        } else {
            console.log('✅ 请求在60秒内完成，符合预期');
        }

        return true;

    } catch (error) {
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        console.log('❌ 请求失败');
        console.log('结束时间:', new Date().toLocaleString());
        console.log('耗时:', duration, '秒');
        console.log();

        if (error.response) {
            console.log('错误状态码:', error.response.status);
            console.log('错误信息:', error.response.data);
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.log('⚠️  请求超时');
            console.log('错误类型:', error.code);
            console.log('错误消息:', error.message);
            console.log();
            console.log('这可能意味着：');
            console.log('1. 服务器端的超时配置还未生效（需要重启服务）');
            console.log('2. 请求确实需要超过300秒（考虑增加超时时间）');
            console.log('3. DeepSeek API 本身响应缓慢（检查 DeepSeek 服务状态）');
        } else {
            console.log('错误类型:', error.code || error.name);
            console.log('错误消息:', error.message);
        }

        return false;
    }
}

/**
 * 测试正常响应（应该很快完成）
 */
async function testNormalContent() {
    console.log('【测试2】正常内容生成（maxTokens=500）');
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
        console.log('开始时间:', new Date().toLocaleString());
        console.log('发送请求...');

        const response = await axios.post(API_URL, {
            messages: [
                {
                    role: 'user',
                    content: '请用一段话介绍什么是人工智能。'
                }
            ],
            maxTokens: 500,
            temperature: 0.7,
            stream: false
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        console.log('✅ 请求成功完成');
        console.log('结束时间:', new Date().toLocaleString());
        console.log('耗时:', duration, '秒');
        console.log();
        console.log('响应长度:', response.data.data.message.length, '字符');
        console.log('响应内容:', response.data.data.message);
        console.log();

        return true;

    } catch (error) {
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        console.log('❌ 请求失败');
        console.log('耗时:', duration, '秒');
        console.log('错误:', error.response?.data || error.message);
        console.log();

        return false;
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    const results = [];

    // 测试1: 长内容生成
    results.push(await testLongContent());
    console.log();

    // 测试2: 正常内容生成
    results.push(await testNormalContent());
    console.log();

    // 汇总结果
    console.log('='.repeat(80));
    console.log('测试结果汇总');
    console.log('='.repeat(80));
    console.log();

    const passCount = results.filter(r => r).length;
    const failCount = results.length - passCount;

    console.log(`总测试数: ${results.length}`);
    console.log(`✅ 通过: ${passCount}`);
    console.log(`❌ 失败: ${failCount}`);
    console.log();

    if (failCount === 0) {
        console.log('🎉 所有测试通过！超时问题已成功修复。');
    } else {
        console.log('⚠️  部分测试失败，请检查日志并排查问题。');
        console.log();
        console.log('排查步骤：');
        console.log('1. 确认 API 服务器已重启: pm2 restart mp-auto-push-api');
        console.log('2. 检查 .env 中的 DEEPSEEK_TIMEOUT 配置');
        console.log('3. 查看服务器日志: pm2 logs mp-auto-push-api --lines 50');
        console.log('4. 验证 DeepSeek API 服务可用性');
    }

    console.log();
}

// 运行测试
runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});
