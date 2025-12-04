// Three.js场景管理器
class SceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.meshes = new Map(); // 存储节点对应的Mesh
        this.transformManager = null; // 变换管理器
        
        // 确保DOM完全加载后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }
    
    init() {
        try {
            console.log("开始初始化Three.js场景");
            
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x222222); // 深灰色背景
            
            // 获取画布的实际尺寸
            const width = this.canvas.parentElement.clientWidth;
            const height = this.canvas.parentElement.clientHeight;
            
            console.log("画布尺寸:", width, "x", height);
            
            // 创建相机
            this.camera = new THREE.PerspectiveCamera(
                75, 
                width / height, 
                0.1, 
                1000
            );
            this.camera.position.z = 5;
            this.camera.position.y = 2;
            this.camera.lookAt(0, 0, 0);
            
            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                antialias: true 
            });
            this.renderer.setSize(width, height);
            
            // 添加基础光源
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 10, 5);
            this.scene.add(directionalLight);
            
            // 添加坐标轴辅助
            const axesHelper = new THREE.AxesHelper(2);
            this.scene.add(axesHelper);
            
            // 添加网格地面
            const gridHelper = new THREE.GridHelper(10, 10);
            this.scene.add(gridHelper);
            
            // 初始化变换管理器
            this.transformManager = new TransformManager(this.scene, this.camera, this.canvas);
            
            // 开始渲染循环
            this.animate();
            
            console.log("Three.js场景初始化完成");
            
        } catch (error) {
            console.error("Three.js初始化失败:", error);
        }
    }
    
    // 选中节点并显示变换控制
    selectNode(nodeId) {
        const node = ProjectData.getNode(nodeId);
        if (node && this.transformManager) {
            this.transformManager.attachToNode(node);
        }
    }
    
    // 取消选中
    deselectNode() {
        if (this.transformManager) {
            this.transformManager.detach();
        }
    }
    
    // 添加立方体到场景
    addBox(node) {
        const geometry = new THREE.BoxGeometry(
            node.params.width, 
            node.params.height, 
            node.params.depth
        );
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // 应用变换矩阵
        const matrix = new THREE.Matrix4().fromArray(node.transform);
        mesh.applyMatrix4(matrix);
        
        this.scene.add(mesh);
        this.meshes.set(node.id, mesh);
        
        console.log("场景中添加立方体:", node.id);
        return mesh;
    }
    
    // 添加球体到场景
    addSphere(node) {
        const geometry = new THREE.SphereGeometry(node.params.radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x2196F3,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // 应用变换矩阵
        const matrix = new THREE.Matrix4().fromArray(node.transform);
        mesh.applyMatrix4(matrix);
        
        this.scene.add(mesh);
        this.meshes.set(node.id, mesh);
        
        console.log("场景中添加球体:", node.id);
        return mesh;
    }
    
    // 根据节点类型添加对应的几何体
    addPrimitive(node) {
        if (node.geometry === 'box') {
            return this.addBox(node);
        } else if (node.geometry === 'sphere') {
            return this.addSphere(node);
        }
        return null;
    }
    
    // 清除所有几何体
    clearAllMeshes() {
        this.meshes.forEach((mesh, nodeId) => {
            this.scene.remove(mesh);
        });
        this.meshes.clear();
    }
    
    // 重新构建场景（用于刷新）
    rebuildScene() {
        this.clearAllMeshes();
        
        // 遍历所有节点并添加到场景
        ProjectData.nodes.forEach((node, nodeId) => {
            this.addPrimitive(node);
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}