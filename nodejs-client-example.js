const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * 微信 AI 图片生成客户端
 * API: https://wechat.easy-write.com
 */

// ==================== 配置 ====================
const API_BASE_URL = 'https://wechat.easy-write.com';
const API_KEY = 'your_api_key_here';  // 替换为你的 API Key

// ==================== 场景一：文本转图片 ====================
async function textToImage() {
  console.log('\n=== 场景一：文本转图片（Nano Banana）===');

  try {
    const form = new FormData();
    form.append('prompt', 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme');

    const response = await axios.post(
      `${API_BASE_URL}/api/image/generate-wechat`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-API-Key': API_KEY
        },
        timeout: 180000  // 3分钟超时
      }
    );

    if (response.data.success) {
      console.log('✅ 生成成功！');
      console.log('✅ 微信图片URL:', response.data.data.wechatImageUrl);
      console.log('✅ 场景类型:', response.data.data.sceneType);
      console.log('✅ 图片大小:', (response.data.data.imageSize / 1024).toFixed(2), 'KB');
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    throw error;
  }
}

// ==================== 场景二：修改图片 ====================
async function editImage(imagePath, prompt) {
  console.log('\n=== 场景二：修改图片 ===');
  console.log('图片路径:', imagePath);
  console.log('提示词:', prompt);

  try {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('images', fs.createReadStream(imagePath));

    const response = await axios.post(
      `${API_BASE_URL}/api/image/generate-wechat`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-API-Key': API_KEY
        },
        timeout: 180000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data.success) {
      console.log('✅ 修改成功！');
      console.log('✅ 微信图片URL:', response.data.data.wechatImageUrl);
      console.log('✅ 场景类型:', response.data.data.sceneType);
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    throw error;
  }
}

// ==================== 场景三：组合多张图片 ====================
async function composeImages(imagePaths, prompt) {
  console.log('\n=== 场景三：组合多张图片 ===');
  console.log('图片数量:', imagePaths.length);
  console.log('提示词:', prompt);

  try {
    const form = new FormData();
    form.append('prompt', prompt);

    for (const imagePath of imagePaths) {
      form.append('images', fs.createReadStream(imagePath));
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/image/generate-wechat`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-API-Key': API_KEY
        },
        timeout: 180000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data.success) {
      console.log('✅ 组合成功！');
      console.log('✅ 微信图片URL:', response.data.data.wechatImageUrl);
      console.log('✅ 场景类型:', response.data.data.sceneType);
      console.log('✅ 输入图片数量:', response.data.data.inputImagesCount);
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    throw error;
  }
}

// ==================== 场景四：使用客户端凭证 ====================
async function generateWithCredentials(prompt, credentials) {
  console.log('\n=== 场景四：使用客户端凭证 ===');
  console.log('提示词:', prompt);

  try {
    const form = new FormData();
    form.append('prompt', prompt);

    // 添加客户端凭证（可选）
    if (credentials.googleApiKey) {
      form.append('apiKey', credentials.googleApiKey);
    }
    if (credentials.wechatAppId) {
      form.append('appId', credentials.wechatAppId);
    }
    if (credentials.wechatAppSecret) {
      form.append('appsecret', credentials.wechatAppSecret);
    }

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
      console.log('✅ 生成成功！');
      console.log('✅ 微信图片URL:', response.data.data.wechatImageUrl);
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    throw error;
  }
}

// ==================== 健康检查 ====================
async function healthCheck() {
  console.log('\n=== 健康检查 ===');

  try {
    const response = await axios.get(`${API_BASE_URL}/health`);

    if (response.data.success) {
      console.log('✅ 服务器运行正常');
      console.log('✅ 状态:', response.data.status);
      console.log('✅ 时间:', response.data.timestamp);
      return true;
    }
  } catch (error) {
    console.error('❌ 服务器连接失败:', error.message);
    return false;
  }
}

// ==================== 封装的客户端类 ====================
class WechatImageClient {
  constructor(apiKey, baseURL = 'https://wechat.easy-write.com') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  /**
   * 文本转图片
   */
  async textToImage(prompt) {
    const form = new FormData();
    form.append('prompt', prompt);
    return await this._sendRequest(form);
  }

  /**
   * 修改图片
   */
  async editImage(prompt, imagePath) {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('images', fs.createReadStream(imagePath));
    return await this._sendRequest(form);
  }

  /**
   * 组合多张图片
   */
  async composeImages(prompt, imagePaths) {
    const form = new FormData();
    form.append('prompt', prompt);

    for (const imagePath of imagePaths) {
      form.append('images', fs.createReadStream(imagePath));
    }

    return await this._sendRequest(form);
  }

  /**
   * 使用客户端凭证
   */
  async generateWithCredentials(prompt, credentials = {}) {
    const form = new FormData();
    form.append('prompt', prompt);

    if (credentials.googleApiKey) {
      form.append('apiKey', credentials.googleApiKey);
    }
    if (credentials.wechatAppId) {
      form.append('appId', credentials.wechatAppId);
    }
    if (credentials.wechatAppSecret) {
      form.append('appsecret', credentials.wechatAppSecret);
    }

    return await this._sendRequest(form);
  }

  /**
   * 发送请求（私有方法）
   */
  async _sendRequest(form) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/image/generate-wechat`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'X-API-Key': this.apiKey
          },
          timeout: 180000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`API错误: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('网络错误: 无法连接到服务器');
      } else {
        throw error;
      }
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      throw new Error('健康检查失败: ' + error.message);
    }
  }
}

// ==================== 运行示例 ====================
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   微信 AI 图片生成 - Node.js 客户端示例           ║');
  console.log('║   API: https://wechat.easy-write.com              ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // 检查 API Key
  if (API_KEY === 'your_api_key_here') {
    console.error('\n❌ 错误: 请先设置 API_KEY');
    console.log('修改文件开头的 API_KEY 变量');
    return;
  }

  // 先进行健康检查
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error('\n❌ 服务器不可用，请检查网络连接');
    return;
  }

  try {
    // 场景1: 文本转图片（推荐先运行这个）
    await textToImage();

    // 场景2: 修改图片（需要图片文件）
    // if (fs.existsSync('./cat.png')) {
    //   await editImage('./cat.png', 'Add a small wizard hat on this cat');
    // }

    // 场景3: 组合图片（需要多张图片文件）
    // if (fs.existsSync('./image1.png') && fs.existsSync('./image2.png')) {
    //   await composeImages(
    //     ['./image1.png', './image2.png'],
    //     'Combine these images into a creative composition'
    //   );
    // }

    // 场景4: 使用客户端凭证
    // await generateWithCredentials(
    //   'Create a nano banana picture',
    //   {
    //     googleApiKey: 'your_google_api_key',
    //     wechatAppId: 'your_wechat_app_id',
    //     wechatAppSecret: 'your_wechat_app_secret'
    //   }
    // );

    console.log('\n✅ 所有测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// ==================== 使用封装类的示例 ====================
async function exampleUsingClass() {
  console.log('\n=== 使用封装类 ===');

  const client = new WechatImageClient('your_api_key_here');

  try {
    // 健康检查
    const health = await client.healthCheck();
    console.log('健康检查:', health);

    // 生成图片
    const result = await client.textToImage(
      'Create a picture of a nano banana dish'
    );
    console.log('微信URL:', result.wechatImageUrl);

  } catch (error) {
    console.error('错误:', error.message);
  }
}

// ==================== 导出 ====================
module.exports = {
  WechatImageClient,
  textToImage,
  editImage,
  composeImages,
  generateWithCredentials,
  healthCheck
};

// 如果直接运行此文件
if (require.main === module) {
  main();
}
