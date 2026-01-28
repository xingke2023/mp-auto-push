const axios = require('axios');
const FormData = require('form-data');

/**
 * 快速测试脚本
 * 测试 https://wechat.easy-write.com 接口
 */

const API_BASE_URL = 'https://wechat.easy-write.com';
const API_KEY = process.env.API_KEY || 'your_api_key';

async function quickTest() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   快速测试 - 微信 AI 图片生成                      ║');
  console.log('║   API: https://wechat.easy-write.com              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // 1. 健康检查
  console.log('1️⃣  健康检查...');
  try {
    const health = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ 服务器正常:', health.data.status);
  } catch (error) {
    console.error('❌ 服务器连接失败');
    console.error('   错误:', error.message);
    return;
  }

  // 2. 生成 Nano Banana 图片
  console.log('\n2️⃣  生成 Nano Banana 图片...');
  console.log('   ⏱️  预计需要 30-90 秒，请耐心等待...\n');

  try {
    const form = new FormData();
    // 使用明确的图片生成指令
    form.append('prompt', 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme');

    const response = await axios.post(
      `${API_BASE_URL}/api/image/generate-wechat`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-API-Key': API_KEY
        },
        timeout: 180000
      }
    );

    if (response.data.success) {
      console.log('✅ 生成成功！\n');
      console.log('📊 结果信息:');
      console.log('   微信图片URL:', response.data.data.wechatImageUrl);
      console.log('   场景类型:', response.data.data.sceneType);
      console.log('   图片大小:', (response.data.data.imageSize / 1024).toFixed(2), 'KB');
      console.log('   提示词:', response.data.data.prompt.substring(0, 50) + '...');
      console.log('\n💡 提示: 此 URL 可直接用于微信公众号文章！');
    } else {
      console.error('❌ 生成失败:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 请求失败');
    if (error.response) {
      console.error('   API 错误:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('   超时错误: 生成时间过长');
    } else {
      console.error('   错误:', error.message);
    }
  }

  console.log('\n╚════════════════════════════════════════════════════╝');
}

quickTest();
