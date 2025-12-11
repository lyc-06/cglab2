// js/uiManager.js - Lab 2 Version (With Icons)
import ProjectData from './projectData.js';

export default class UIManager {
    constructor() {
        this.isPlaying = false;
        this.playInterval = null;
        this.init();
    }
    
    init() {
        this.updateTreeView();
        this.bindEvents();
        this.saveHistoryState(); 
    }
    
    bindEvents() {
        document.getElementById('addBoxBtn').onclick = () => this.addPrimitive('box');
        document.getElementById('addSphereBtn').onclick = () => this.addPrimitive('sphere');
        
        document.getElementById('unionBtn').onclick = () => this.doBoolean('UNION');
        document.getElementById('subtractBtn').onclick = () => this.doBoolean('SUBTRACT');
        document.getElementById('intersectBtn').onclick = () => this.doBoolean('INTERSECT');
        
        document.getElementById('exportBtn').onclick = () => this.exportJSON();
        document.getElementById('importBtn').onclick = () => document.getElementById('fileInput').click();
        document.getElementById('fileInput').onchange = (e) => this.importJSON(e);

        const slider = document.getElementById('historySlider');
        if(slider) slider.oninput = (e) => this.onSliderChange(e.target.value);
        
        document.getElementById('playBtn').onclick = () => this.togglePlay();
    }
    
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
            btn.innerHTML = '<i class="fa-solid fa-play"></i>'; // 恢复播放图标
        } else {
            this.isPlaying = true;
            btn.innerHTML = '<i class="fa-solid fa-pause"></i>'; // 显示暂停图标
            
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
        type === 'box' ? ProjectData.addBox() : ProjectData.addSphere();
        this.refreshAll(true); 
    }
    
    doBoolean(opType) {
        const selected = ProjectData.getSelectedNodes();
        if (selected.length !== 2) {
            alert("Please select exactly two nodes!"); // 稍微改成了英文提示以匹配风格
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
            div.style.marginLeft = (level * 16) + 'px';
            
            if (ProjectData.selectedNodeIds.has(node.id)) {
                div.classList.add('selected');
            }
            
            // === 使用图标替代 Emoji ===
            let iconHtml = '';
            if (node.type === 'primitive') {
                if (node.geometry === 'box') {
                    iconHtml = '<i class="fa-solid fa-cube"></i>';
                } else {
                    iconHtml = '<i class="fa-solid fa-circle"></i>';
                }
            } else {
                iconHtml = '<i class="fa-solid fa-layer-group"></i>';
            }
            
            div.innerHTML = `${iconHtml} <span>${node.name || node.id}</span>`;
            
            div.onclick = (e) => {
                e.stopPropagation();
                ProjectData.toggleSelection(node.id);
                this.refreshAll(false); 
                
                if (window.app.sceneManager) {
                    window.app.sceneManager.selectNodes(ProjectData.getSelectedNodes());
                }
                
                const status = document.getElementById('statusInfo');
                if (status) {
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
                alert("Import successful!");
            }
        };
        reader.readAsText(file);
    }
}