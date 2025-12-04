// UI管理器
class UIManager {
    constructor() {
        this.init();
    }
    
    init() {
        console.log("UI管理器初始化");
        
        // 初始化CSG树显示区域
        this.updateTreeView();
        
        // 绑定按钮事件
        this.bindButtonEvents();
    }
    
    // 绑定按钮点击事件
    bindButtonEvents() {
        // 添加立方体按钮
        const addBoxBtn = document.getElementById('addBoxBtn');
        if (addBoxBtn) {
            addBoxBtn.addEventListener('click', () => {
                this.onAddBox();
            });
        }
        
        // 添加球体按钮
        const addSphereBtn = document.getElementById('addSphereBtn');
        if (addSphereBtn) {
            addSphereBtn.addEventListener('click', () => {
                this.onAddSphere();
            });
        }
        
        console.log("按钮事件绑定完成");
    }
    
    // 添加立方体处理
    onAddBox() {
        console.log("点击添加立方体按钮");
        const boxNode = ProjectData.addBox();
        
        // 更新场景
        if (window.app && window.app.sceneManager) {
            window.app.sceneManager.addBox(boxNode);
        }
        
        // 更新UI树状图
        this.updateTreeView();
        
        // 更新状态信息
        this.updateStatusInfo(`已添加立方体: ${boxNode.name}`);
    }
    
    // 添加球体处理
    onAddSphere() {
        console.log("点击添加球体按钮");
        const sphereNode = ProjectData.addSphere();
        
        // 更新场景
        if (window.app && window.app.sceneManager) {
            window.app.sceneManager.addSphere(sphereNode);
        }
        
        // 更新UI树状图
        this.updateTreeView();
        
        // 更新状态信息
        this.updateStatusInfo(`已添加球体: ${sphereNode.name}`);
    }
    
    // 更新CSG树显示
    updateTreeView() {
        const treeView = document.getElementById('csgTreeView');
        if (!treeView) return;
        
        if (ProjectData.nodes.size === 0) {
            treeView.innerHTML = '<div class="tree-node">暂无操作历史</div>';
            return;
        }
        
        let html = '<div class="tree-section-title">操作历史树</div>';
        
        ProjectData.nodes.forEach((node, nodeId) => {
            const nodeClass = node.type === 'primitive' ? 'primitive-node' : 'operation-node';
            const icon = node.geometry === 'box' ? '⬜' : '⭕';
            const name = node.name || node.id;
            
            html += `
                <div class="tree-node ${nodeClass}" data-node-id="${node.id}">
                    ${icon} ${name} (${node.geometry})
                </div>
            `;
        });
        
        treeView.innerHTML = html;
        
        // 绑定树节点点击事件
        this.bindTreeNodeEvents();
    }
    
    // 绑定树节点点击事件
    bindTreeNodeEvents() {
        const treeNodes = document.querySelectorAll('.tree-node[data-node-id]');
        treeNodes.forEach(nodeElement => {
            nodeElement.addEventListener('click', (event) => {
                const nodeId = event.currentTarget.getAttribute('data-node-id');
                this.onTreeNodeClick(nodeId);
            });
        });
    }
    
    // 树节点点击处理
    onTreeNodeClick(nodeId) {
        console.log("点击树节点:", nodeId);
        const node = ProjectData.selectNode(nodeId);
        
        // 更新选中状态样式
        this.updateTreeNodeSelection(nodeId);
        
        // 更新状态信息
        this.updateStatusInfo(`已选中: ${node.name} - 可拖动黄色线框进行变换`);
        
        // 通知场景管理器选中该节点
        if (window.app && window.app.sceneManager) {
            window.app.sceneManager.selectNode(nodeId);
        }
    }
    
    // 更新树节点选中状态
    updateTreeNodeSelection(selectedNodeId) {
        const allNodes = document.querySelectorAll('.tree-node[data-node-id]');
        allNodes.forEach(nodeElement => {
            nodeElement.classList.remove('selected');
        });
        
        const selectedNode = document.querySelector(`.tree-node[data-node-id="${selectedNodeId}"]`);
        if (selectedNode) {
            selectedNode.classList.add('selected');
        }
    }
    
    // 更新状态信息
    updateStatusInfo(message) {
        const statusInfo = document.getElementById('statusInfo');
        if (statusInfo) {
            statusInfo.textContent = message;
        }
    }
}