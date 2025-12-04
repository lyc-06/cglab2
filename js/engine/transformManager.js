// 变换控制系统管理器
class TransformManager {
    constructor(scene, camera, canvas) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.transformControls = null;
        this.ghostMesh = null; // 当前显示的代理体
        
        this.init();
    }
    
    init() {
        // 初始化变换控制器
        this.transformControls = new THREE.TransformControls(this.camera, this.canvas);
        this.scene.add(this.transformControls);
        
        // 监听变换事件
        this.transformControls.addEventListener('change', () => {
            this.onTransformChange();
        });
        
        // 监听拖拽完成事件
        this.transformControls.addEventListener('mouseUp', () => {
            this.onTransformEnd();
        });
        
        console.log("变换控制系统初始化完成");
    }
    
    // 为指定节点创建代理体并附加变换控制
    attachToNode(node) {
        // 先移除现有的代理体
        this.detach();
        
        if (!node) {
            console.log("未提供节点，移除变换控制");
            return;
        }
        
        console.log("为节点创建代理体:", node.id);
        
        // 根据节点类型创建代理体
        this.ghostMesh = this.createGhostMesh(node);
        
        if (this.ghostMesh) {
            // 将变换控制器附加到代理体
            this.transformControls.attach(this.ghostMesh);
            this.transformControls.visible = true;
            
            console.log("变换控制已附加到代理体");
        }
    }
    
    // 创建代理体（幽灵模式）
    createGhostMesh(node) {
        let geometry, material;
        
        if (node.geometry === 'box') {
            geometry = new THREE.BoxGeometry(
                node.params.width, 
                node.params.height, 
                node.params.depth
            );
        } else if (node.geometry === 'sphere') {
            geometry = new THREE.SphereGeometry(node.params.radius, 16, 16);
        } else {
            console.error("未知的几何体类型:", node.geometry);
            return null;
        }
        
        // 创建线框材质
        material = new THREE.MeshBasicMaterial({
            color: 0xffff00, // 黄色高亮
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 应用节点的变换矩阵
        const matrix = new THREE.Matrix4().fromArray(node.transform);
        mesh.applyMatrix4(matrix);
        
        this.scene.add(mesh);
        
        return mesh;
    }
    
    // 变换改变时的回调
    onTransformChange() {
        if (this.ghostMesh && ProjectData.selectedNode) {
            // 更新选中节点的变换矩阵
            this.updateNodeTransform(ProjectData.selectedNode.id, this.ghostMesh.matrix);
            
            // 触发场景重绘（在阶段三会替换为CSG重计算）
            if (window.app && window.app.sceneManager) {
                window.app.sceneManager.rebuildScene();
            }
        }
    }
    
    // 变换结束时的回调
    onTransformEnd() {
        console.log("变换操作完成");
        // 这里可以添加历史记录保存等操作
    }
    
    // 更新节点的变换矩阵
    updateNodeTransform(nodeId, matrix) {
        const node = ProjectData.getNode(nodeId);
        if (node) {
            // 将THREE.Matrix4转换为数组
            node.transform = matrix.toArray();
            console.log("更新节点变换:", nodeId, node.transform);
        }
    }
    
    // 移除变换控制
    detach() {
        this.transformControls.detach();
        this.transformControls.visible = false;
        
        // 移除代理体
        if (this.ghostMesh) {
            this.scene.remove(this.ghostMesh);
            this.ghostMesh = null;
        }
    }
    
    // 设置变换模式（平移、旋转、缩放）
    setMode(mode) {
        this.transformControls.setMode(mode);
        console.log("设置变换模式:", mode);
    }
    
    // 显示/隐藏变换控制器
    setVisible(visible) {
        this.transformControls.visible = visible;
    }
}