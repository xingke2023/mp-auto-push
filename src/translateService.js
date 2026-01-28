const querystring = require('querystring');
const axios = require('axios');
const { logger } = require('./logger');

// 尝试使用更新的 google-translate-api 库
let googleTranslate;
try {
    googleTranslate = require('@vitalets/google-translate-api');
    logger.info('[TranslateService] 使用 @vitalets/google-translate-api 库');
} catch (error) {
    logger.warn('[TranslateService] @vitalets/google-translate-api 库不可用，尝试使用本地库');
    try {
        googleTranslate = require('../google-translate-api/index.js');
        logger.info('[TranslateService] 使用本地 google-translate-api 库');
    } catch (error2) {
        logger.warn('[TranslateService] 所有 google-translate-api 库都不可用，将使用自定义实现');
    }
}

/**
 * Google 翻译服务
 * 参考 google-translate-api 实现
 */
class TranslateService {
    constructor() {
        // 支持的语言列表（ISO 639-1 codes）
        this.languages = {
            'auto': 'Automatic',
            'af': 'Afrikaans',
            'sq': 'Albanian',
            'am': 'Amharic',
            'ar': 'Arabic',
            'hy': 'Armenian',
            'az': 'Azerbaijani',
            'eu': 'Basque',
            'be': 'Belarusian',
            'bn': 'Bengali',
            'bs': 'Bosnian',
            'bg': 'Bulgarian',
            'ca': 'Catalan',
            'ceb': 'Cebuano',
            'ny': 'Chichewa',
            'zh-cn': 'Chinese Simplified',
            'zh-tw': 'Chinese Traditional',
            'co': 'Corsican',
            'hr': 'Croatian',
            'cs': 'Czech',
            'da': 'Danish',
            'nl': 'Dutch',
            'en': 'English',
            'eo': 'Esperanto',
            'et': 'Estonian',
            'tl': 'Filipino',
            'fi': 'Finnish',
            'fr': 'French',
            'fy': 'Frisian',
            'gl': 'Galician',
            'ka': 'Georgian',
            'de': 'German',
            'el': 'Greek',
            'gu': 'Gujarati',
            'ht': 'Haitian Creole',
            'ha': 'Hausa',
            'haw': 'Hawaiian',
            'iw': 'Hebrew',
            'hi': 'Hindi',
            'hmn': 'Hmong',
            'hu': 'Hungarian',
            'is': 'Icelandic',
            'ig': 'Igbo',
            'id': 'Indonesian',
            'ga': 'Irish',
            'it': 'Italian',
            'ja': 'Japanese',
            'jw': 'Javanese',
            'kn': 'Kannada',
            'kk': 'Kazakh',
            'km': 'Khmer',
            'ko': 'Korean',
            'ku': 'Kurdish (Kurmanji)',
            'ky': 'Kyrgyz',
            'lo': 'Lao',
            'la': 'Latin',
            'lv': 'Latvian',
            'lt': 'Lithuanian',
            'lb': 'Luxembourgish',
            'mk': 'Macedonian',
            'mg': 'Malagasy',
            'ms': 'Malay',
            'ml': 'Malayalam',
            'mt': 'Maltese',
            'mi': 'Maori',
            'mr': 'Marathi',
            'mn': 'Mongolian',
            'my': 'Myanmar (Burmese)',
            'ne': 'Nepali',
            'no': 'Norwegian',
            'ps': 'Pashto',
            'fa': 'Persian',
            'pl': 'Polish',
            'pt': 'Portuguese',
            'ma': 'Punjabi',
            'ro': 'Romanian',
            'ru': 'Russian',
            'sm': 'Samoan',
            'gd': 'Scots Gaelic',
            'sr': 'Serbian',
            'st': 'Sesotho',
            'sn': 'Shona',
            'sd': 'Sindhi',
            'si': 'Sinhala',
            'sk': 'Slovak',
            'sl': 'Slovenian',
            'so': 'Somali',
            'es': 'Spanish',
            'su': 'Sundanese',
            'sw': 'Swahili',
            'sv': 'Swedish',
            'tg': 'Tajik',
            'ta': 'Tamil',
            'te': 'Telugu',
            'th': 'Thai',
            'tr': 'Turkish',
            'uk': 'Ukrainian',
            'ur': 'Urdu',
            'uz': 'Uzbek',
            'vi': 'Vietnamese',
            'cy': 'Welsh',
            'xh': 'Xhosa',
            'yi': 'Yiddish',
            'yo': 'Yoruba',
            'zu': 'Zulu'
        };
    }

    /**
     * 获取语言代码
     * @param {string} desiredLang - 语言名称或代码
     * @returns {string|boolean} 语言代码或 false
     */
    getCode(desiredLang) {
        if (!desiredLang) {
            return false;
        }
        desiredLang = desiredLang.toLowerCase();

        if (this.languages[desiredLang]) {
            return desiredLang;
        }

        const keys = Object.keys(this.languages).filter(key => {
            if (typeof this.languages[key] !== 'string') {
                return false;
            }
            return this.languages[key].toLowerCase() === desiredLang;
        });

        return keys[0] || false;
    }

    /**
     * 检查语言是否支持
     * @param {string} desiredLang - 语言名称或代码
     * @returns {boolean}
     */
    isSupported(desiredLang) {
        return Boolean(this.getCode(desiredLang));
    }

    /**
     * TKK 值（Google 翻译的密钥，需要定期更新）
     * 可以从 https://translate.google.com 页面源码中提取
     */
    getTKK() {
        // 可以定期从 Google 翻译页面获取最新的 TKK 值
        // 这里使用固定值，如果失效需要更新
        return "434674.96463358";
    }

    /**
     * 位运算函数 uo
     * 用于 token 计算的核心算法
     * @param {number} a - 输入值
     * @param {string} b - 操作字符串
     * @returns {number}
     */
    uo(a, b) {
        for (let c = 0; c < b.length - 2; c += 3) {
            let d = b.charAt(c + 2);
            d = 'a' <= d ? d.charCodeAt(0) - 87 : Number(d);
            d = '+' === b.charAt(c + 1) ? a >>> d : a << d;
            a = '+' === b.charAt(c) ? (a + d) & 4294967295 : a ^ d;
        }
        return a;
    }

    /**
     * 计算翻译 token
     * 基于 Google 翻译的 token 生成算法
     * @param {string} a - 要翻译的文本
     * @param {string} tkk - TKK 值
     * @returns {string}
     */
    wo(a, tkk) {
        const d = tkk.split('.');
        const b = Number(d[0]);
        const e = [];
        let f = 0;
        let g = 0;

        // 将文本转换为 UTF-8 字节数组
        while (g < a.length) {
            const h = a.charCodeAt(g);
            if (128 > h) {
                e[f++] = h;
            } else {
                if (2048 > h) {
                    e[f++] = (h >> 6) | 192;
                } else {
                    if (
                        55296 === (h & 64512) &&
                        g + 1 < a.length &&
                        56320 === (a.charCodeAt(g + 1) & 64512)
                    ) {
                        const h2 = 65536 + ((h & 1023) << 10) + (a.charCodeAt(++g) & 1023);
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

        // 计算 token
        let result = b;
        for (f = 0; f < e.length; f++) {
            result += e[f];
            result = this.uo(result, '+-a^+6');
        }
        result = this.uo(result, '+-3^+b+-f');
        result ^= Number(d[1]) || 0;

        if (0 > result) {
            result = (result & 2147483647) + 2147483648;
        }
        result %= 1e6;

        return result.toString() + '.' + (result ^ b);
    }

    /**
     * 获取翻译令牌
     * 使用 Google 翻译的完整 token 生成算法
     * @param {string} text - 要翻译的文本
     * @returns {Promise<Object>}
     */
    async getToken(text) {
        try {
            const tkk = this.getTKK();
            const token = this.wo(text, tkk);
            return {
                name: 'tk',
                value: token
            };
        } catch (error) {
            logger.warn('[TranslateService] Token 生成失败，使用备用方法:', error.message);
            // 如果 token 生成失败，使用简化版本
            const timestamp = Math.floor(Date.now() / 3600000);
            return {
                name: 'tk',
                value: `${timestamp}.${timestamp}`
            };
        }
    }

    /**
     * 从 Google 翻译页面更新 TKK 值
     * @returns {Promise<string>}
     */
    async updateTKK() {
        try {
            const response = await axios.get('https://translate.google.com', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });

            const match = response.data.match(/tkk:'(\d+\.\d+)'/);
            if (match && match[1]) {
                logger.info(`[TranslateService] TKK 更新成功: ${match[1]}`);
                return match[1];
            }

            logger.warn('[TranslateService] 未能从页面提取 TKK 值');
            return this.getTKK();
        } catch (error) {
            logger.error('[TranslateService] TKK 更新失败:', error.message);
            return this.getTKK();
        }
    }

    /**
     * 检测是否是单个单词
     * @param {string} text - 要检测的文本
     * @returns {boolean}
     */
    isSingleWord(text) {
        const trimmed = text.trim();
        // 检查是否只包含一个单词（没有空格、标点等）
        // 支持英文单词、带连字符的单词
        return /^[a-zA-Z]+(-[a-zA-Z]+)?$/.test(trimmed);
    }

    /**
     * 获取单词详细信息（词典模式）
     * @param {string} word - 要查询的单词
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} 详细的单词信息
     */
    async getWordDetails(word, options = {}) {
        try {
            const fromLang = options.from || 'auto';
            const toLang = options.to || 'zh-cn';

            logger.info(`[Dictionary] 查询单词详情: ${word} (${fromLang} -> ${toLang})`);

            // 获取 token
            const token = await this.getToken(word);

            // 使用更详细的 dt 参数来获取词典信息
            const url = 'https://translate.google.com.hk/translate_a/single';
            const dtParams = [
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

            const queryString = `client=webapp&sl=${fromLang}&tl=${toLang}&hl=zh-CN&${dtParams}&ie=UTF-8&oe=UTF-8&otf=2&ssel=0&tsel=0&kc=1&tk=${token.value}&q=${encodeURIComponent(word)}`;

            const response = await axios({
                method: 'post',
                url: `${url}?${queryString}`,
                headers: {
                    'accept': '*/*',
                    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'origin': 'https://translate.google.com.hk',
                    'referer': 'https://translate.google.com.hk/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 30000,
                validateStatus: (status) => status >= 200 && status < 500
            });

            if (response.status === 403) {
                logger.error('[Dictionary] Google 拒绝访问 (403)');
                throw new Error('词典服务暂时不可用');
            }

            const body = response.data;

            // 构建详细的单词信息
            const result = {
                word: word,
                detectedLanguage: body[2] || fromLang,
                targetLanguage: toLang,
                translations: [],
                definitions: [],
                examples: [],
                synonyms: [],
                relatedWords: []
            };

            // 提取主要翻译
            if (body[0]) {
                body[0].forEach(item => {
                    if (item && item[0]) {
                        result.translations.push({
                            text: item[0],
                            partOfSpeech: item[1] || null
                        });
                    }
                });
            }

            // 提取词典信息（不同词性的翻译）
            if (body[1]) {
                body[1].forEach(posGroup => {
                    if (posGroup && posGroup[0]) {
                        const partOfSpeech = posGroup[0]; // 词性
                        const meanings = posGroup[2] || [];

                        meanings.forEach(meaning => {
                            if (meaning && meaning[0]) {
                                result.definitions.push({
                                    partOfSpeech: partOfSpeech,
                                    meaning: meaning[0],
                                    synonyms: meaning[1] || [],
                                    frequency: meaning[3] || 0
                                });
                            }
                        });
                    }
                });
            }

            // 提取例句
            if (body[13]) {
                body[13].forEach(exampleGroup => {
                    if (exampleGroup && exampleGroup[0]) {
                        exampleGroup[0].forEach(example => {
                            if (example && example[0]) {
                                // 清理 HTML 标签
                                let source = example[0];
                                let translation = example[1] || '';

                                // 移除 HTML 标签
                                source = source.replace(/<[^>]*>/g, '').trim();
                                translation = translation.replace(/<[^>]*>/g, '').trim();

                                // 只添加有效的例句
                                if (source && source.length > 2) {
                                    result.examples.push({
                                        source: source,
                                        translation: translation
                                    });
                                }
                            }
                        });
                    }
                });
            }

            // 提取同义词
            if (body[11]) {
                body[11].forEach(synGroup => {
                    if (synGroup && synGroup[1]) {
                        synGroup[1].forEach(synList => {
                            if (synList && synList[0]) {
                                result.synonyms.push({
                                    partOfSpeech: synGroup[0] || '',
                                    words: synList[0] || []
                                });
                            }
                        });
                    }
                });
            }

            logger.info(`[Dictionary] 单词详情获取成功 - 翻译: ${result.translations.length}, 定义: ${result.definitions.length}, 例句: ${result.examples.length}`);

            return result;

        } catch (error) {
            logger.error('[Dictionary] 获取单词详情失败:', error.message);
            throw error;
        }
    }

    /**
     * 翻译文本
     * @param {string} text - 要翻译的文本
     * @param {Object} options - 翻译选项
     * @param {string} options.from - 源语言（默认：auto）
     * @param {string} options.to - 目标语言（默认：en）
     * @param {boolean} options.raw - 是否返回原始响应（默认：false）
     * @param {boolean} options.detailed - 是否返回详细信息（单词模式）（默认：auto 自动检测）
     * @returns {Promise<Object>} 翻译结果
     */
    async translate(text, options = {}) {
        try {
            // 参数验证
            if (!text || text.trim().length === 0) {
                throw new Error('翻译文本不能为空');
            }

            // 设置默认选项
            options.from = options.from || 'auto';
            options.to = options.to || 'en';

            // 验证语言是否支持
            if (!this.isSupported(options.from)) {
                throw new Error(`不支持的源语言: ${options.from}`);
            }
            if (!this.isSupported(options.to)) {
                throw new Error(`不支持的目标语言: ${options.to}`);
            }

            // 获取语言代码
            const fromLang = this.getCode(options.from);
            const toLang = this.getCode(options.to);

            // 检测是否是单个单词，如果是且未明确指定 detailed，则自动使用详细模式
            const isSingleWord = this.isSingleWord(text);
            const useDetailedMode = options.detailed !== false && isSingleWord;

            if (useDetailedMode) {
                logger.info(`[Translate] 检测到单词查询 - ${text}, 使用词典模式`);
                try {
                    const wordDetails = await this.getWordDetails(text, { from: fromLang, to: toLang });
                    // 返回标准格式，但包含详细信息
                    return {
                        text: wordDetails.translations[0]?.text || '',
                        from: {
                            language: {
                                didYouMean: false,
                                iso: wordDetails.detectedLanguage
                            },
                            text: {
                                autoCorrected: false,
                                value: '',
                                didYouMean: false
                            }
                        },
                        raw: '',
                        // 词典详细信息
                        dictionary: {
                            word: wordDetails.word,
                            translations: wordDetails.translations,
                            definitions: wordDetails.definitions,
                            examples: wordDetails.examples,
                            synonyms: wordDetails.synonyms
                        }
                    };
                } catch (dictError) {
                    logger.warn(`[Translate] 词典模式失败，降级为普通翻译: ${dictError.message}`);
                    // 如果词典模式失败，继续使用普通翻译
                }
            }

            logger.info(`[Translate] 翻译请求 - 从 ${fromLang} 到 ${toLang}, 文本长度: ${text.length}`);

            // 如果可以使用 google-translate-api 库，优先使用
            if (googleTranslate) {
                try {
                    const result = await googleTranslate(text, {
                        from: fromLang,
                        to: toLang,
                        raw: options.raw || false
                    });

                    logger.info(`[Translate] 翻译成功（使用 google-translate-api） - 检测语言: ${result.from.language.iso}, 结果长度: ${result.text.length}`);
                    return result;
                } catch (libError) {
                    logger.warn('[Translate] google-translate-api 库翻译失败，尝试使用自定义实现:', libError.message);
                }
            }

            // 自定义实现（备用）
            // 使用 free-google-translate 的实现原理

            // 获取 token
            const token = await this.getToken(text);

            // 构建请求 URL - 使用 .hk 域名通常更稳定
            const url = 'https://translate.google.com.hk/translate_a/single';

            // 构建查询参数字符串 - 手动构建以确保格式正确
            const dtParams = ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't']
                .map(dt => `dt=${dt}`).join('&');

            const queryString = `client=webapp&sl=${fromLang}&tl=${toLang}&hl=zh-CN&${dtParams}&ie=UTF-8&oe=UTF-8&otf=2&ssel=0&tsel=0&kc=1&tk=${token.value}&q=${encodeURIComponent(text)}`;

            // 发送请求 - 使用 POST 方法，模拟真实的浏览器请求
            const response = await axios({
                method: 'post',
                url: `${url}?${queryString}`,
                headers: {
                    'accept': '*/*',
                    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'origin': 'https://translate.google.com.hk',
                    'referer': 'https://translate.google.com.hk/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'x-client-data': 'CJK2yQEIpLbJAQjEtskBCKmdygEIqKPKAQi5pcoBCLGnygEI4qjKAQjxqcoBCJetygEIza3KAQ==',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin'
                },
                timeout: 30000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500; // 允许处理 403 等错误
                }
            });

            // 检查响应状态
            if (response.status === 403) {
                logger.error('[Translate] Google 拒绝访问 (403)，可能需要更新 TKK 或使用代理');
                throw new Error('Google 翻译暂时不可用，请稍后再试或使用其他翻译源');
            }

            if (response.status >= 400) {
                logger.error(`[Translate] 请求失败，状态码: ${response.status}`);
                throw new Error(`翻译服务返回错误: ${response.status}`);
            }

            // 解析响应
            const result = {
                text: '',
                from: {
                    language: {
                        didYouMean: false,
                        iso: ''
                    },
                    text: {
                        autoCorrected: false,
                        value: '',
                        didYouMean: false
                    }
                },
                raw: ''
            };

            if (options.raw) {
                result.raw = JSON.stringify(response.data);
            }

            const body = response.data;

            // 提取翻译文本
            if (body[0]) {
                body[0].forEach(obj => {
                    if (obj && obj[0]) {
                        result.text += obj[0];
                    }
                });
            }

            // 提取源语言信息
            if (body[2] === body[8]?.[0]?.[0]) {
                result.from.language.iso = body[2];
            } else {
                result.from.language.didYouMean = true;
                result.from.language.iso = body[8]?.[0]?.[0] || body[2];
            }

            // 提取拼写纠正信息
            if (body[7] && body[7][0]) {
                let str = body[7][0];
                str = str.replace(/<b><i>/g, '[');
                str = str.replace(/<\/i><\/b>/g, ']');

                result.from.text.value = str;

                if (body[7][5] === true) {
                    result.from.text.autoCorrected = true;
                } else {
                    result.from.text.didYouMean = true;
                }
            }

            logger.info(`[Translate] 翻译成功 - 检测语言: ${result.from.language.iso}, 结果长度: ${result.text.length}`);

            return result;

        } catch (error) {
            logger.error('[Translate] 翻译失败:', error);

            // 错误分类
            if (error.response) {
                if (error.response.status === 429) {
                    throw new Error('请求过于频繁，请稍后再试');
                } else if (error.response.status >= 500) {
                    throw new Error('Google 翻译服务暂时不可用');
                }
            }

            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                throw new Error('翻译请求超时，请检查网络连接');
            }

            throw new Error(`翻译失败: ${error.message}`);
        }
    }

    /**
     * 批量翻译
     * @param {Array<string>} texts - 要翻译的文本数组
     * @param {Object} options - 翻译选项
     * @returns {Promise<Array<Object>>} 翻译结果数组
     */
    async translateBatch(texts, options = {}) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('texts 必须是非空数组');
        }

        logger.info(`[Translate] 批量翻译请求 - 数量: ${texts.length}`);

        const results = [];
        for (let i = 0; i < texts.length; i++) {
            try {
                const result = await this.translate(texts[i], options);
                results.push({
                    index: i,
                    success: true,
                    original: texts[i],
                    translated: result.text,
                    detectedLanguage: result.from.language.iso
                });
            } catch (error) {
                logger.error(`[Translate] 批量翻译第 ${i + 1} 项失败:`, error);
                results.push({
                    index: i,
                    success: false,
                    original: texts[i],
                    error: error.message
                });
            }

            // 添加延迟以避免请求过于频繁
            if (i < texts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        logger.info(`[Translate] 批量翻译完成 - 成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`);

        return results;
    }

    /**
     * 获取支持的语言列表
     * @returns {Object} 语言列表
     */
    getSupportedLanguages() {
        return { ...this.languages };
    }
}

module.exports = TranslateService;
