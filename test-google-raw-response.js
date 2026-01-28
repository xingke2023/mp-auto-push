/**
 * 测试 Google 翻译 API 原生响应数据
 * 查看 Google 返回的原始数据结构
 */

const axios = require('axios');

/**
 * 生成 token（简化版）
 */
function generateToken(text, tkk = "434674.96463358") {
    const d = tkk.split('.');
    const b = Number(d[0]);

    function uo(a, b) {
        for (let c = 0; c < b.length - 2; c += 3) {
            let d = b.charAt(c + 2);
            d = 'a' <= d ? d.charCodeAt(0) - 87 : Number(d);
            d = '+' === b.charAt(c + 1) ? a >>> d : a << d;
            a = '+' === b.charAt(c) ? (a + d) & 4294967295 : a ^ d;
        }
        return a;
    }

    const e = [];
    let f = 0;
    let g = 0;

    while (g < text.length) {
        const h = text.charCodeAt(g);
        if (128 > h) {
            e[f++] = h;
        } else {
            if (2048 > h) {
                e[f++] = (h >> 6) | 192;
            } else {
                if (55296 === (h & 64512) && g + 1 < text.length && 56320 === (text.charCodeAt(g + 1) & 64512)) {
                    const h2 = 65536 + ((h & 1023) << 10) + (text.charCodeAt(++g) & 1023);
                    e[f++] = (h2 >> 18) | 240;
                    e[f++] = ((h2 >> 12) & 63) | 128;
                } else {
                    e[f++] = (h >> 12) | 224;
                }
                e[f++] = ((h >> 6) & 63) | 128;
            }
            e[f++] = (h & 63) | 128;
        }
        g++;
    }

    let result = b;
    for (f = 0; f < e.length; f++) {
        result += e[f];
        result = uo(result, '+-a^+6');
    }
    result = uo(result, '+-3^+b+-f');
    result ^= Number(d[1]) || 0;

    if (0 > result) {
        result = (result & 2147483647) + 2147483648;
    }
    result %= 1e6;

    return result.toString() + '.' + (result ^ b);
}

/**
 * 查询 Google 翻译原始响应
 */
async function getGoogleRawResponse(word, detailed = false) {
    try {
        const token = generateToken(word);
        const url = 'https://translate.google.com.hk/translate_a/single';

        // 根据是否需要详细信息选择不同的 dt 参数
        let dtParams;
        if (detailed) {
            // 词典模式 - 获取所有可能的数据
            dtParams = [
                't',   // 翻译
                'at',  // 备选翻译
                'bd',  // 词典
                'ex',  // 例句
                'ld',  // 检测语言
                'md',  // 定义
                'qca', // 拼写纠正
                'rw',  // 相关词
                'rm',  // 罗马音
                'ss',  // 同义词
                'gt'   // 语法
            ].map(dt => `dt=${dt}`).join('&');
        } else {
            // 普通翻译模式
            dtParams = ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't']
                .map(dt => `dt=${dt}`).join('&');
        }

        const queryString = `client=webapp&sl=auto&tl=zh-cn&hl=zh-CN&${dtParams}&ie=UTF-8&oe=UTF-8&otf=2&ssel=0&tsel=0&kc=1&tk=${token}&q=${encodeURIComponent(word)}`;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Google 翻译 API 原始响应 - "${word}"`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('请求 URL:', url);
        console.log('查询字符串:', queryString.substring(0, 100) + '...\n');

        const response = await axios({
            method: 'post',
            url: `${url}?${queryString}`,
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'origin': 'https://translate.google.com.hk',
                'referer': 'https://translate.google.com.hk/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        console.log('响应状态:', response.status);
        console.log('响应类型:', typeof response.data);
        console.log('是否为数组:', Array.isArray(response.data));
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  原始响应数据 (完整 JSON)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 打印完整的原始 JSON
        console.log(JSON.stringify(response.data, null, 2));

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  数组结构分析');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (Array.isArray(response.data)) {
            console.log(`总共有 ${response.data.length} 个顶层元素\n`);

            response.data.forEach((item, index) => {
                if (item === null || item === undefined) {
                    console.log(`[${index}] null/undefined`);
                } else if (Array.isArray(item)) {
                    console.log(`[${index}] 数组 - 长度: ${item.length}`);
                    if (item.length > 0 && item.length <= 5) {
                        console.log(`      内容预览:`, JSON.stringify(item).substring(0, 100) + '...');
                    }
                } else if (typeof item === 'object') {
                    console.log(`[${index}] 对象 - 键:`, Object.keys(item));
                } else {
                    console.log(`[${index}] ${typeof item} - 值:`, item);
                }
            });
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  关键数据位置说明');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const data = response.data;

        console.log('data[0] - 翻译结果数组:');
        if (data[0]) {
            console.log('  包含翻译文本和词性信息');
            console.log('  示例:', JSON.stringify(data[0][0]));
        }

        console.log('\ndata[1] - 词典信息（按词性）:');
        if (data[1]) {
            console.log('  包含不同词性的释义');
            console.log('  数量:', data[1].length, '个词性');
        } else {
            console.log('  无');
        }

        console.log('\ndata[2] - 检测的源语言:');
        console.log(' ', data[2]);

        console.log('\ndata[11] - 同义词:');
        if (data[11]) {
            console.log('  包含同义词分组');
            console.log('  数量:', data[11].length, '个分组');
        } else {
            console.log('  无');
        }

        console.log('\ndata[13] - 例句:');
        if (data[13]) {
            console.log('  包含例句和翻译');
            console.log('  数量:', data[13].length);
        } else {
            console.log('  无');
        }

        return response.data;

    } catch (error) {
        console.error('❌ 错误:', error.message);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        throw error;
    }
}

/**
 * 主测试函数
 */
async function runTests() {
    console.log('\n' + '═'.repeat(70));
    console.log('  Google 翻译 API 原始响应数据测试');
    console.log('═'.repeat(70) + '\n');

    // 测试1: 简单单词
    await getGoogleRawResponse('hello', true);

    console.log('\n\n' + '═'.repeat(70));
    console.log('  测试完成');
    console.log('═'.repeat(70) + '\n');
}

// 运行测试
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { getGoogleRawResponse };
