const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Google Gemini 图片生成 API 测试脚本
 *
 * 使用前请确保：
 * 1. 已在 .env 中配置 GOOGLE_AI_API_KEY 和 API_KEY
 * 2. API 服务器正在运行（npm run api）
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5003';
const API_KEY = process.env.API_KEY || 'your_api_key';

// ============== 场景一：文本转图片 ==============
async function testTextToImage() {
    console.log('\n=== 测试场景一：文本转图片 ===');

    try {
        const response = await axios.post(`${API_BASE_URL}/api/image/generate`, {
            prompt: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });

        if (response.data.success) {
            console.log('✓ 生成成功');
            console.log('场景类型:', response.data.data.sceneType);
            console.log('图片大小:', response.data.data.size, 'bytes');

            // 保存图片
            const imageData = response.data.data.imageData;
            const buffer = Buffer.from(imageData, 'base64');
            fs.writeFileSync('test-output-text-to-image.png', buffer);
            console.log('✓ 图片已保存到: test-output-text-to-image.png');
        }
    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 场景二：修改图片（使用 JSON Base64）==============
async function testEditImageJSON() {
    console.log('\n=== 测试场景二：修改图片（JSON Base64） ===');

    // 首先需要有一张测试图片
    if (!fs.existsSync('test-input-cat.png')) {
        console.log('⚠ 请先准备一张测试图片: test-input-cat.png');
        return;
    }

    try {
        // 读取图片并转为 base64
        const imageBuffer = fs.readFileSync('test-input-cat.png');
        const base64Image = imageBuffer.toString('base64');

        const response = await axios.post(`${API_BASE_URL}/api/image/generate`, {
            prompt: 'Using the provided image, please add a small, knitted wizard hat on top',
            imagesData: [
                {
                    data: base64Image,
                    mimeType: 'image/png'
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        });

        if (response.data.success) {
            console.log('✓ 修改成功');
            console.log('场景类型:', response.data.data.sceneType);
            console.log('输入图片数量:', response.data.data.inputImagesCount);

            // 保存图片
            const imageData = response.data.data.imageData;
            const buffer = Buffer.from(imageData, 'base64');
            fs.writeFileSync('test-output-edited.png', buffer);
            console.log('✓ 图片已保存到: test-output-edited.png');
        }
    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 场景二：修改图片（使用文件上传）==============
async function testEditImageUpload() {
    console.log('\n=== 测试场景二：修改图片（文件上传） ===');

    // 首先需要有一张测试图片
    if (!fs.existsSync('test-input-cat.png')) {
        console.log('⚠ 请先准备一张测试图片: test-input-cat.png');
        return;
    }

    try {
        const form = new FormData();
        form.append('prompt', 'Using the provided image, please add a small, knitted wizard hat on top');
        form.append('images', fs.createReadStream('test-input-cat.png'));

        const response = await axios.post(`${API_BASE_URL}/api/image/generate`, form, {
            headers: {
                ...form.getHeaders(),
                'X-API-Key': API_KEY
            }
        });

        if (response.data.success) {
            console.log('✓ 修改成功');
            console.log('场景类型:', response.data.data.sceneType);
            console.log('输入图片数量:', response.data.data.inputImagesCount);

            // 保存图片
            const imageData = response.data.data.imageData;
            const buffer = Buffer.from(imageData, 'base64');
            fs.writeFileSync('test-output-edited-upload.png', buffer);
            console.log('✓ 图片已保存到: test-output-edited-upload.png');
        }
    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 场景三：组合多张图片 ==============
async function testComposeImages() {
    console.log('\n=== 测试场景三：组合多张图片 ===');

    // 需要两张测试图片
    if (!fs.existsSync('test-input-1.png') || !fs.existsSync('test-input-2.png')) {
        console.log('⚠ 请先准备两张测试图片: test-input-1.png 和 test-input-2.png');
        return;
    }

    try {
        const form = new FormData();
        form.append('prompt', 'Combine these two images into a creative composition');
        form.append('images', fs.createReadStream('test-input-1.png'));
        form.append('images', fs.createReadStream('test-input-2.png'));

        const response = await axios.post(`${API_BASE_URL}/api/image/generate`, form, {
            headers: {
                ...form.getHeaders(),
                'X-API-Key': API_KEY
            }
        });

        if (response.data.success) {
            console.log('✓ 组合成功');
            console.log('场景类型:', response.data.data.sceneType);
            console.log('输入图片数量:', response.data.data.inputImagesCount);

            // 保存图片
            const imageData = response.data.data.imageData;
            const buffer = Buffer.from(imageData, 'base64');
            fs.writeFileSync('test-output-composed.png', buffer);
            console.log('✓ 图片已保存到: test-output-composed.png');
        }
    } catch (error) {
        console.error('✗ 测试失败:', error.response?.data || error.message);
    }
}

// ============== 运行所有测试 ==============
async function runAllTests() {
    console.log('Google Gemini 图片生成 API 测试');
    console.log('================================');

    // 测试场景一：文本转图片（总是可以测试）
    await testTextToImage();

    // 测试场景二：修改图片（需要准备测试图片）
    await testEditImageJSON();
    await testEditImageUpload();

    // 测试场景三：组合图片（需要准备测试图片）
    await testComposeImages();

    console.log('\n=== 测试完成 ===\n');
}

// 根据命令行参数运行特定测试
const testType = process.argv[2];

if (testType === 'text') {
    testTextToImage();
} else if (testType === 'edit') {
    testEditImageUpload();
} else if (testType === 'edit-json') {
    testEditImageJSON();
} else if (testType === 'compose') {
    testComposeImages();
} else {
    console.log('使用方法:');
    console.log('  node test-image-api.js          - 运行所有测试');
    console.log('  node test-image-api.js text     - 仅测试文本转图片');
    console.log('  node test-image-api.js edit     - 仅测试修改图片（文件上传）');
    console.log('  node test-image-api.js edit-json - 仅测试修改图片（JSON Base64）');
    console.log('  node test-image-api.js compose  - 仅测试组合图片');
    console.log('');
    runAllTests();
}
