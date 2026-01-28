const axios = require('axios');
const fs = require('fs');

/**
 * 微信版 AI 图片生成 API 测试脚本
 *
 * 使用前请确保：
 * 1. 已在 .env 中配置 GOOGLE_API_KEY、WECHAT_APP_ID、WECHAT_APP_SECRET 和 API_KEY
 * 2. API 服务器正在运行（npm run api）
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5003';
const API_KEY = process.env.API_KEY || 'your_api_key';

// ============== 场景一：生成 Nano Banana 并上传微信 ==============
async function testNanoBananaWechat() {
    console.log('\n=== 测试场景一：生成 Nano Banana 并上传微信 ===');

    try {
        console.log('📸 正在生成图片并上传到微信...');
        console.log('⏱️  预计需要 30-90 秒，请耐心等待...\n');

        const response = await axios.post(`${API_BASE_URL}/api/image/generate-wechat`, {
            prompt: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            timeout: 180000 // 3分钟超时
        });

        if (response.data.success) {
            const { wechatImageUrl, imageSize, sceneType, prompt } = response.data.data;

            console.log('✓ 图片生成并上传微信成功！');
            console.log('✓ 微信图片URL:', wechatImageUrl);
            console.log('✓ 图片大小:', (imageSize / 1024).toFixed(2), 'KB');
            console.log('✓ 场景类型:', sceneType);
            console.log('✓ 提示词:', prompt.substring(0, 50) + '...');
            console.log('✓ 时间戳:', response.data.timestamp);
            console.log('\n💡 提示：此 URL 可直接用于微信公众号文章！');

            return wechatImageUrl;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error('✗ 请求超时，生成时间过长');
        } else if (error.response) {
            console.error('✗ API 错误:', error.response.data);
        } else if (error.request) {
            console.error('✗ 网络错误，无法连接到服务器');
        } else {
            console.error('✗ 错误:', error.message);
        }
    }
}

// ============== 场景二：生成图片并创建微信草稿 ==============
async function testCreateDraftWithAIImage() {
    console.log('\n=== 测试场景二：生成图片并创建微信草稿 ===');

    try {
        // 1. 生成图片并上传到微信
        console.log('📸 步骤1: 生成 AI 图片并上传到微信...');

        const imageResponse = await axios.post(`${API_BASE_URL}/api/image/generate-wechat`, {
            prompt: 'Create a beautiful nano banana dessert with colorful decorations in modern restaurant'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            timeout: 180000
        });

        if (!imageResponse.data.success) {
            throw new Error('图片生成失败: ' + imageResponse.data.message);
        }

        const wechatImageUrl = imageResponse.data.data.wechatImageUrl;
        console.log('✓ 图片已上传到微信');
        console.log('✓ 微信图片URL:', wechatImageUrl);

        // 2. 使用微信图片URL创建草稿
        console.log('\n📝 步骤2: 创建微信公众号草稿...');

        const draftResponse = await axios.post(`${API_BASE_URL}/api/draft/create`, {
            title: '探索未来美食：Nano Banana 的奇幻之旅 🍌✨',
            content: `
                <section style="text-align: center;">
                    <h2>🍌 欢迎来到未来餐厅</h2>
                    <p>体验前所未有的 Nano Banana 美食之旅！</p>
                </section>

                <section style="margin: 20px 0;">
                    <img src="${wechatImageUrl}" style="width: 100%; height: auto;" />
                </section>

                <section>
                    <h3>🌟 什么是 Nano Banana？</h3>
                    <p>这是一道充满科技感与艺术气息的创新料理，将传统美食与 AI 艺术完美融合。</p>

                    <h3>🎨 AI 生成的美食艺术</h3>
                    <p>每一道 Nano Banana 都是独一无二的艺术品，由 Google Gemini AI 精心创作。</p>

                    <h3>🚀 未来美食的无限可能</h3>
                    <p>在这里，想象力就是唯一的限制。探索更多未来美食，开启您的味蕾新体验！</p>
                </section>
            `,
            author: 'AI 美食探索者',
            digest: '体验未来美食，探索 Nano Banana 的无限可能。AI 生成的美食艺术等你来品鉴！',
            imageUrl: wechatImageUrl,
            titleMode: 'original'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });

        if (draftResponse.data.success) {
            console.log('✓ 草稿创建成功！');
            console.log('✓ Media ID:', draftResponse.data.data.mediaId);
            console.log('✓ 标题:', draftResponse.data.data.title);
            console.log('\n💡 提示：请登录微信公众号后台查看草稿！');
        }

    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 场景三：使用客户端凭证 ==============
async function testWithClientCredentials() {
    console.log('\n=== 测试场景三：使用客户端凭证 ===');

    // 这个测试需要提供客户端的凭证
    const clientGoogleApiKey = process.env.CLIENT_GOOGLE_API_KEY;
    const clientWechatAppId = process.env.CLIENT_WECHAT_APP_ID;
    const clientWechatAppSecret = process.env.CLIENT_WECHAT_APP_SECRET;

    if (!clientGoogleApiKey || !clientWechatAppId || !clientWechatAppSecret) {
        console.log('⚠️  跳过此测试：需要设置客户端凭证环境变量');
        console.log('   CLIENT_GOOGLE_API_KEY');
        console.log('   CLIENT_WECHAT_APP_ID');
        console.log('   CLIENT_WECHAT_APP_SECRET');
        return;
    }

    try {
        console.log('📸 使用客户端凭证生成图片...');

        const response = await axios.post(`${API_BASE_URL}/api/image/generate-wechat`, {
            prompt: 'Create a simple nano banana illustration',
            apiKey: clientGoogleApiKey,
            appId: clientWechatAppId,
            appsecret: clientWechatAppSecret
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            timeout: 180000
        });

        if (response.data.success) {
            console.log('✓ 使用客户端凭证生成成功！');
            console.log('✓ 微信图片URL:', response.data.data.wechatImageUrl);
        }

    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 场景四：修改图片并上传微信 ==============
async function testEditImageForWechat() {
    console.log('\n=== 测试场景四：修改图片并上传微信 ===');

    // 需要一张测试图片
    if (!fs.existsSync('test-input-cat.png')) {
        console.log('⚠️  跳过此测试：请先准备测试图片 test-input-cat.png');
        return;
    }

    try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('prompt', 'Add a small wizard hat on top of this image');
        form.append('images', fs.createReadStream('test-input-cat.png'));

        console.log('📸 修改图片并上传到微信...');

        const response = await axios.post(`${API_BASE_URL}/api/image/generate-wechat`, form, {
            headers: {
                ...form.getHeaders(),
                'X-API-Key': API_KEY
            },
            timeout: 180000
        });

        if (response.data.success) {
            console.log('✓ 图片修改并上传微信成功！');
            console.log('✓ 微信图片URL:', response.data.data.wechatImageUrl);
            console.log('✓ 场景类型:', response.data.data.sceneType);
        }

    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 测试健康检查 ==============
async function testHealthCheck() {
    console.log('\n=== 测试：健康检查 ===');

    try {
        const response = await axios.get(`${API_BASE_URL}/health`);

        if (response.data.success) {
            console.log('✓ 服务器运行正常');
            console.log('✓ 状态:', response.data.status);
            console.log('✓ 时间:', response.data.timestamp);
        }
    } catch (error) {
        console.error('✗ 服务器连接失败');
        console.error('  请确保 API 服务器正在运行：npm run api');
        process.exit(1);
    }
}

// ============== 运行所有测试 ==============
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   微信版 AI 图片生成 API 测试                      ║');
    console.log('╚════════════════════════════════════════════════════╝');

    // 先检查服务器状态
    await testHealthCheck();

    // 测试场景一：生成 Nano Banana（最基本的功能）
    await testNanoBananaWechat();

    // 测试场景二：生成图片并创建草稿（完整流程）
    await testCreateDraftWithAIImage();

    // 测试场景三：使用客户端凭证（可选）
    await testWithClientCredentials();

    // 测试场景四：修改图片（可选）
    await testEditImageForWechat();

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   测试完成                                         ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
}

// 根据命令行参数运行特定测试
const testType = process.argv[2];

if (testType === 'nano') {
    console.log('运行单个测试: Nano Banana 生成');
    testHealthCheck().then(() => testNanoBananaWechat());
} else if (testType === 'draft') {
    console.log('运行单个测试: 创建草稿');
    testHealthCheck().then(() => testCreateDraftWithAIImage());
} else if (testType === 'client') {
    console.log('运行单个测试: 客户端凭证');
    testHealthCheck().then(() => testWithClientCredentials());
} else if (testType === 'edit') {
    console.log('运行单个测试: 修改图片');
    testHealthCheck().then(() => testEditImageForWechat());
} else if (testType === 'health') {
    console.log('运行单个测试: 健康检查');
    testHealthCheck();
} else {
    console.log('使用方法:');
    console.log('  node test-wechat-image-api.js          - 运行所有测试');
    console.log('  node test-wechat-image-api.js nano     - 仅测试 Nano Banana 生成');
    console.log('  node test-wechat-image-api.js draft    - 仅测试创建草稿');
    console.log('  node test-wechat-image-api.js client   - 仅测试客户端凭证');
    console.log('  node test-wechat-image-api.js edit     - 仅测试修改图片');
    console.log('  node test-wechat-image-api.js health   - 仅测试健康检查');
    console.log('');
    runAllTests();
}
