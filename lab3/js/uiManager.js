// js/uiManager.js
import * as THREE from 'three';
import ProjectData from './projectData.js';
import CommandParser from './CommandParser.js'; // 1. 引入解析器

export default class UIManager {
    constructor() {
        this.parser = new CommandParser(); // 2. 实例化解析器
        this.isPlaying = false;
        this.playInterval = null;
        this.init();
    }
    
    init() {
        this.updateTreeView();
        this.bindEvents();
        // 初始化时不需要保存，由 main.js 控制
    }
    
    bindEvents() {
        // === 3. 绑定 AI 指令事件 ===
        const aiBtn = document.getElementById('aiExecuteBtn');
        const aiInput = document.getElementById('aiInput');
        if (aiBtn && aiInput) {
            aiBtn.onclick = () => this.handleAICommand();
            // 允许按回车键执行
            aiInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.handleAICommand();
            };
        }
        // =========================

        document.getElementById('addBoxBtn').onclick = () => this.addPrimitive('box');
        document.getElementById('addSphereBtn').onclick = () => this.addPrimitive('sphere');
        
        document.getElementById('unionBtn').onclick = () => this.doBoolean('UNION');
        document.getElementById('subtractBtn').onclick = () => this.doBoolean('SUBTRACT');
        document.getElementById('intersectBtn').onclick = () => this.doBoolean('INTERSECT');
        
        document.getElementById('exportBtn').onclick = () => this.exportJSON();
        document.getElementById('importBtn').onclick = () => document.getElementById('fileInput').click();
        document.getElementById('fileInput').onchange = (e) => this.importJSON(e);

        const slider = document.getElementById('historySlider');
        if (slider) slider.oninput = (e) => this.onSliderChange(e.target.value);
        
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.onclick = () => this.togglePlay();
    }

    // === 4. 核心：处理 AI 指令 ===
    handleAICommand() {
        const inputEl = document.getElementById('aiInput');
        const feedbackEl = document.getElementById('aiFeedback');
        const rawText = inputEl.value;

        // 调用解析器
        const result = this.parser.parse(rawText);

        if (!result.success) {
            feedbackEl.style.color = 'red';
            feedbackEl.textContent = `❌ ${result.error}`;
            return;
        }

        feedbackEl.style.color = 'green';
        feedbackEl.textContent = `✅ 识别成功: ${result.command.type} ${result.command.geometry}`;
        console.log("AI Command:", result.command);

        // 执行解析后的命令
        this.executeCommand(result.command);
    }

    executeCommand(cmd) {
        // 情况 A: 创建新物体 (CREATE)
        if (cmd.type === 'CREATE') {
            // 1. 创建节点
            let node;
            if (cmd.geometry === 'box') {
                node = ProjectData.addBox();
                // 应用尺寸参数
                node.params.width = cmd.params.width || 1;
                node.params.height = cmd.params.height || 1;
                node.params.depth = cmd.params.depth || 1;
            } else {
                node = ProjectData.addSphere();
                // 应用半径参数
                node.params.radius = cmd.params.radius || 1;
            }

            // 2. 应用位置 (修改 transform 矩阵)
            // Three.js 矩阵操作：先重置，再设置位置
            const matrix = new THREE.Matrix4();
            matrix.setPosition(cmd.position.x, cmd.position.y, cmd.position.z);
            node.transform = matrix.toArray();

            // 3. 刷新并保存
            this.refreshAll(true);
        }
        
        // 情况 B: 布尔运算 (BOOLEAN)
        else if (cmd.type === 'BOOLEAN') {
            // 逻辑：用"当前选中的物体" 去操作 "这个新生成的物体"
            const selected = ProjectData.getSelectedNodes();
            
            if (selected.length === 0) {
                alert("AI 提示：请先在场景中选中一个物体作为基础，再执行布尔操作！");
                return;
            }
            const baseNode = selected[0]; // 这是一个 Node 对象

            // 1. 创建操作体 (Operand)
            let operandNode;
            if (cmd.geometry === 'box') {
                operandNode = ProjectData.addBox();
                operandNode.params.width = cmd.params.width || 1;
                operandNode.params.height = cmd.params.height || 1;
                operandNode.params.depth = cmd.params.depth || 1;
            } else {
                operandNode = ProjectData.addSphere();
                operandNode.params.radius = cmd.params.radius || 1;
            }

            // 2. 设置操作体位置
            const matrix = new THREE.Matrix4();
            matrix.setPosition(cmd.position.x, cmd.position.y, cmd.position.z);
            operandNode.transform = matrix.toArray();

            // 3. 执行布尔运算 (Apply Operation)
            // 注意：applyOperation 会自动把 operandNode 设为非根节点
            ProjectData.applyOperation(baseNode.id, operandNode.id, cmd.operation);

            // 4. 自动选中新生成的节点，方便连续操作
            // (ProjectData 应该返回新节点，但目前的 applyOperation 返回 opNode)
            // 我们重新获取选中状态会比较安全
            ProjectData.selectedNodeIds.clear();
            // ProjectData.selectNode(newNodeId); // 暂略，用户需手动选

            this.refreshAll(true);
        }
    }
    // ===========================
    
    saveHistoryState() {
        const index = ProjectData.saveState();
        this.updateHistoryUI(index);
    }

    updateHistoryUI(index) {
        const slider = document.getElementById('historySlider');
        const label = document.getElementById('stepLabel');
        const max = ProjectData.historyStack.length - 1;
        
        if (slider) {
            slider.max = max;
            slider.value = index;
        }
        if (label) {
            label.textContent = `${index}/${max}`;
        }
    }

    onSliderChange(val) {
        const index = parseInt(val);
        ProjectData.restoreState(index);
        this.refreshAll(false); 
        
        document.getElementById('stepLabel').textContent = `${index}/${ProjectData.historyStack.length - 1}`;
    }

    togglePlay() {
        const btn = document.getElementById('playBtn');
        if (this.isPlaying) {
            this.isPlaying = false;
            clearInterval(this.playInterval);
            btn.textContent = "▶";
        } else {
            this.isPlaying = true;
            btn.textContent = "⏸";
            
            let current = parseInt(document.getElementById('historySlider').value);
            if (current >= ProjectData.historyStack.length - 1) {
                current = -1;
            }
            
            this.playInterval = setInterval(() => {
                current++;
                if (current >= ProjectData.historyStack.length) {
                    this.togglePlay(); 
                    return;
                }
                
                document.getElementById('historySlider').value = current;
                this.onSliderChange(current);
                
            }, 500); 
        }
    }
    
    addPrimitive(type) {
        const node = type === 'box' ? ProjectData.addBox() : ProjectData.addSphere();
        this.refreshAll(true); 
    }
    
    doBoolean(opType) {
        const selected = ProjectData.getSelectedNodes();
        if (selected.length !== 2) {
            alert("请先在树状图中选中两个节点！");
            return;
        }
        
        const opNode = ProjectData.applyOperation(selected[0].id, selected[1].id, opType);
        if (opNode) {
            ProjectData.selectedNodeIds.clear();
            ProjectData.selectNode(opNode.id);
            this.refreshAll(true);
        }
    }
    
    refreshAll(saveHistory = false) {
        if (saveHistory) {
            this.saveHistoryState();
        }
        
        this.updateTreeView();
        if (window.app && window.app.sceneManager) {
            window.app.sceneManager.rebuildScene();
        }
    }
    
    updateTreeView() {
        const container = document.getElementById('csgTreeView');
        if (!container) return;
        container.innerHTML = '';
        
        const renderNode = (node, level) => {
            const div = document.createElement('div');
            div.className = 'tree-node';
            div.style.marginLeft = (level * 16) + 'px'; // 稍微减小缩进
            
            if (ProjectData.selectedNodeIds.has(node.id)) {
                div.classList.add('selected');
            }
            
            // === 修改开始：使用 FontAwesome 图标替代 Emoji ===
            let iconHtml = '';
            if (node.type === 'primitive') {
                if (node.geometry === 'box') {
                    iconHtml = '<i class="fa-solid fa-cube"></i>'; // 立方体图标
                } else {
                    iconHtml = '<i class="fa-solid fa-circle"></i>'; // 球体图标
                }
            } else {
                // 操作节点图标 (Union/Subtract/Intersect)
                iconHtml = '<i class="fa-solid fa-layer-group"></i>'; 
            }
            
            // 使用 innerHTML 插入图标
            div.innerHTML = `${iconHtml} <span>${node.name || node.id}</span>`;
            // === 修改结束 ===
            
            div.onclick = (e) => {
                e.stopPropagation();
                ProjectData.toggleSelection(node.id);
                this.refreshAll(false); 
                
                if (window.app.sceneManager) {
                    window.app.sceneManager.selectNodes(ProjectData.getSelectedNodes());
                }
                
                const status = document.getElementById('statusInfo');
                if (status) {
                    // 状态栏也去除 Emoji，只显示名字
                    const names = ProjectData.getSelectedNodes().map(n=>n.name).join(', ');
                    status.textContent = names ? `Selected: ${names}` : 'No selection';
                }
            };
            
            container.appendChild(div);
            
            if (node.type === 'operation') {
                renderNode(node.left, level + 1);
                renderNode(node.right, level + 1);
            }
        };

        ProjectData.nodes.forEach(node => {
            if (node.isRoot) {
                renderNode(node, 0);
            }
        });
    }

    exportJSON() {
        const json = ProjectData.toJSON();
        const blob = new Blob([json], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "csg_project.json";
        a.click();
    }

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const success = ProjectData.loadJSON(e.target.result);
            if (success) {
                this.saveHistoryState(); 
                this.refreshAll(false);
                alert("加载成功！");
            }
        };
        reader.readAsText(file);
    }
}