// 主应用程序
class App {
    constructor() {
        this.sceneManager = null;
        this.uiManager = null;
        
        // 将app实例挂载到window，便于其他模块访问
        window.app = this;
        
        this.init();
    }
    
    init() {
        console.log("应用程序启动");
        
        // 错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
        });
        
        // 使用setTimeout确保所有DOM元素完全加载
        setTimeout(() => {
            this.start();
        }, 100);
    }
    
    start() {
        try {
            console.log("开始初始化应用组件");
            
            // 检查必要的DOM元素
            const canvas = document.getElementById('threeCanvas');
            if (!canvas) {
                throw new Error('未找到Three.js画布元素');
            }
            
            // 初始化场景管理器
            this.sceneManager = new SceneManager('threeCanvas');
            
            // 初始化UI管理器
            this.uiManager = new UIManager();
            
            console.log("CSG建模编辑器启动成功");
            
            // 更新调试信息
            const debugInfo = document.getElementById('debugInfo');
            if (debugInfo) {
                debugInfo.textContent = `系统状态: 正常运行 | 场景: 已加载`;
            }
            
        } catch (error) {
            console.error("启动失败:", error);
            const debugInfo = document.getElementById('debugInfo');
            if (debugInfo) {
                debugInfo.textContent = `错误: ${error.message}`;
                debugInfo.style.backgroundColor = 'red';
            }
        }
    }
}

// 启动应用
const app = new App();