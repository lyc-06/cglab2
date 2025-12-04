// js/main.js
// 注意：现在所有文件都在同级目录，所以路径都变成了 ./
import SceneManager from './sceneManager.js';
import UIManager from './uiManager.js';
import ProjectData from './projectData.js';

class App {
    constructor() {
        this.sceneManager = null;
        this.uiManager = null;
        window.app = this; // 挂载到全局方便调试
        this.init();
    }
    
    init() {
        try {
            console.log("初始化应用...");
            
            this.sceneManager = new SceneManager('threeCanvas');
            this.uiManager = new UIManager();
            
            console.log("应用启动成功");
        } catch (e) {
            console.error("启动错误:", e);
        }
    }
}

new App();