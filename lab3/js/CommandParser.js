// js/CommandParser.js

/**
 * 实验3核心模块：基于规则的自然语言指令解析器
 * 职责：将自然语言字符串转换为标准的 CommandObject
 */
export default class CommandParser {
    constructor() {
        // 定义词汇表（白名单）
        this.vocabulary = {
            actions: {
                create: ['add', 'create', 'make', 'new'],
                boolean: ['subtract', 'cut', 'remove', 'union', 'combine', 'intersect']
            },
            shapes: {
                box: ['box', 'cube', 'square'],
                sphere: ['sphere', 'ball', 'circle']
            },
            keywords: {
                size: ['size', 'width', 'height', 'depth'], // Box 参数
                radius: ['radius', 'r'],                    // Sphere 参数
                position: ['at', 'position', 'pos', 'loc']  // 位置参数
            }
        };
    }

    /**
     * 主解析函数
     * @param {string} input - 用户输入的原始字符串
     * @returns {Object} result - 解析结果 { success: boolean, command: Object, error: string }
     */
    parse(input) {
        if (!input || typeof input !== 'string') {
            return { success: false, error: "输入为空" };
        }

        // 1. 预处理 (Preprocessing)
        // 转小写 -> 去首尾空格 -> 将多个空格合并为一个
        const cleanInput = input.toLowerCase().trim().replace(/\s+/g, ' ');
        
        // 2. 分词 (Tokenization)
        const tokens = cleanInput.split(' ');

        if (tokens.length === 0) {
            return { success: false, error: "无法识别指令" };
        }

        // 3. 语义分析 (Semantic Parsing)
        try {
            const command = this._analyzeTokens(tokens);
            return { success: true, command: command };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * 内部方法：分析 Token 数组并提取意图
     */
    _analyzeTokens(tokens) {
        // A. 识别操作类型 (Intent Recognition)
        const actionToken = tokens[0];
        let actionType = null;
        let booleanOp = null;

        if (this._isWordInList(actionToken, this.vocabulary.actions.create)) {
            actionType = 'CREATE';
        } else if (this._isWordInList(actionToken, this.vocabulary.actions.boolean)) {
            actionType = 'BOOLEAN';
            // 映射具体的布尔操作符
            if (['subtract', 'cut', 'remove'].includes(actionToken)) booleanOp = 'SUBTRACT';
            else if (['union', 'combine'].includes(actionToken)) booleanOp = 'UNION';
            else if (['intersect'].includes(actionToken)) booleanOp = 'INTERSECT';
        } else {
            throw new Error(`无法识别的动词: "${actionToken}" (支持 add, subtract, union, intersect 等)`);
        }

        // B. 识别几何体形状 (Entity Extraction)
        let geometry = null;
        for (const token of tokens) {
            if (this._isWordInList(token, this.vocabulary.shapes.box)) {
                geometry = 'box';
                break;
            } else if (this._isWordInList(token, this.vocabulary.shapes.sphere)) {
                geometry = 'sphere';
                break;
            }
        }
        
        if (!geometry) {
            throw new Error("未找到几何体类型 (box 或 sphere)");
        }

        // C. 提取参数 (Parameter Extraction)
        // 默认参数
        let params = geometry === 'box' 
            ? { width: 1, height: 1, depth: 1 } 
            : { radius: 1 };
        
        // 默认位置
        let position = { x: 0, y: 0, z: 0 };

        // 遍历 Token 寻找关键词
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // C1. 解析位置 (at x y z)
            if (this._isWordInList(token, this.vocabulary.keywords.position)) {
                if (i + 3 < tokens.length) {
                    position.x = parseFloat(tokens[i+1]) || 0;
                    position.y = parseFloat(tokens[i+2]) || 0;
                    position.z = parseFloat(tokens[i+3]) || 0;
                    i += 3; // 跳过已读取的参数
                }
            }

            // C2. 解析 Sphere 半径 (radius x)
            if (geometry === 'sphere' && this._isWordInList(token, this.vocabulary.keywords.radius)) {
                if (i + 1 < tokens.length) {
                    params.radius = parseFloat(tokens[i+1]) || 1;
                    i += 1;
                }
            }

            // C3. 解析 Box 尺寸 (size w h d) 或 (size s)
            if (geometry === 'box' && this._isWordInList(token, this.vocabulary.keywords.size)) {
                // 简单处理：尝试读取后1个或3个数字
                const next1 = parseFloat(tokens[i+1]);
                const next2 = parseFloat(tokens[i+2]);
                const next3 = parseFloat(tokens[i+3]);

                if (!isNaN(next1) && !isNaN(next2) && !isNaN(next3)) {
                    // size 1 2 3
                    params.width = next1;
                    params.height = next2;
                    params.depth = next3;
                    i += 3;
                } else if (!isNaN(next1)) {
                    // size 1 (立方体)
                    params.width = next1;
                    params.height = next1;
                    params.depth = next1;
                    i += 1;
                }
            }
        }

        // 组装最终对象
        const result = {
            type: actionType,
            geometry: geometry,
            params: params,
            position: position
        };

        if (actionType === 'BOOLEAN') {
            result.operation = booleanOp;
        }

        return result;
    }

    /**
     * 辅助函数：检查单词是否在列表中（模糊匹配）
     */
    _isWordInList(word, list) {
        return list.includes(word);
    }
}