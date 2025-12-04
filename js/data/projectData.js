// 全局项目数据管理
const ProjectData = {
    // 当前的CSG树根节点
    rootNode: null,
    
    // 当前选中的节点
    selectedNode: null,
    
    // 节点ID计数器
    nextNodeId: 1,
    
    // 所有节点的映射表，便于快速查找
    nodes: new Map(),
    
    // 初始化空的CSG树
    init: function() {
        console.log("ProjectData initialized");
        this.nextNodeId = 1;
        this.nodes.clear();
    },
    
    // 生成唯一节点ID
    generateNodeId: function() {
        return `node_${this.nextNodeId++}`;
    },
    
    // 添加立方体基元
    addBox: function() {
        const nodeId = this.generateNodeId();
        
        const boxNode = {
            id: nodeId,
            type: 'primitive',
            geometry: 'box',
            params: { 
                width: 1, 
                height: 1, 
                depth: 1 
            },
            transform: [
                1, 0, 0, 0,
                0, 1, 0, 0, 
                0, 0, 1, 0,
                0, 0, 0, 1  // 单位矩阵
            ],
            name: `立方体_${this.nextNodeId}`
        };
        
        this.nodes.set(nodeId, boxNode);
        
        // 如果是第一个节点，设为根节点
        if (!this.rootNode) {
            this.rootNode = boxNode;
        }
        
        console.log("添加立方体:", boxNode);
        return boxNode;
    },
    
    // 添加球体基元
    addSphere: function() {
        const nodeId = this.generateNodeId();
        
        const sphereNode = {
            id: nodeId,
            type: 'primitive', 
            geometry: 'sphere',
            params: { 
                radius: 0.5 
            },
            transform: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0, 
                0, 0, 0, 1  // 单位矩阵
            ],
            name: `球体_${this.nextNodeId}`
        };
        
        this.nodes.set(nodeId, sphereNode);
        
        // 如果是第一个节点，设为根节点
        if (!this.rootNode) {
            this.rootNode = sphereNode;
        }
        
        console.log("添加球体:", sphereNode);
        return sphereNode;
    },
    
    // 根据ID获取节点
    getNode: function(nodeId) {
        return this.nodes.get(nodeId);
    },
    
    // 选中节点
    selectNode: function(nodeId) {
        this.selectedNode = this.getNode(nodeId);
        console.log("选中节点:", this.selectedNode);
        return this.selectedNode;
    }
};

// 初始化项目数据
ProjectData.init();