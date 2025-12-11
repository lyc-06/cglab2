import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg';
import ProjectData from './projectData.js';
import TransformManager from './transformManager.js';

export default class SceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.evaluator = new Evaluator();
        
        // 高级磨砂白材质
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,      
            roughness: 0.5,
            metalness: 0.1,
            flatShading: false,   
            side: THREE.DoubleSide
        });
        
        this.init();
    }
    
    init() {
        this.scene = new THREE.Scene();
        
        const bgColor = 0x1c1c1e; // 深空灰
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.Fog(bgColor, 15, 50);

        const parent = this.canvas.parentElement;
        this.camera = new THREE.PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.1, 1000);
        this.camera.position.set(6, 4, 8); 
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(parent.clientWidth, parent.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // === 灯光系统 ===
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048; 
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0001;      
        mainLight.shadow.normalBias = 0.02;   
        this.scene.add(mainLight);

        const rimLight = new THREE.DirectionalLight(0x4455ff, 0.4);
        rimLight.position.set(-5, 2, -5);
        this.scene.add(rimLight);
        
        // === 地面系统 ===
        const planeGeo = new THREE.PlaneGeometry(100, 100);
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.15, color: 0x000000 });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.501; 
        plane.receiveShadow = true;
        this.scene.add(plane);
        
        const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x282828);
        gridHelper.position.y = -0.5;
        this.scene.add(gridHelper);
        
        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);
        
        this.transformManager = new TransformManager(this.scene, this.camera, this.canvas);
        
        this.animate();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.camera.aspect = parent.clientWidth / parent.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(parent.clientWidth, parent.clientHeight);
        }
    }

    evaluateCSGTree(node) {
        if (!node) return null;

        if (node.type === 'primitive') {
            let geometry;
            if (node.geometry === 'box') {
                geometry = new THREE.BoxGeometry(node.params.width, node.params.height, node.params.depth);
            } else if (node.geometry === 'sphere') {
                geometry = new THREE.SphereGeometry(node.params.radius, 64, 64);
            }
            
            const brush = new Brush(geometry, this.material);
            brush.castShadow = true; 
            brush.receiveShadow = true;
            
            const matrix = new THREE.Matrix4().fromArray(node.transform);
            brush.applyMatrix4(matrix);
            brush.updateMatrixWorld();
            return brush;
        } 
        else if (node.type === 'operation') {
            const brushA = this.evaluateCSGTree(node.left);
            const brushB = this.evaluateCSGTree(node.right);
            
            if (!brushA || !brushB) return null;

            let op;
            switch(node.op) {
                case 'UNION': op = ADDITION; break;
                case 'SUBTRACT': op = SUBTRACTION; break;
                case 'INTERSECT': op = INTERSECTION; break;
                default: op = ADDITION;
            }
            
            const resultBrush = this.evaluator.evaluate(brushA, brushB, op);
            resultBrush.material = this.material;
            resultBrush.castShadow = true;
            resultBrush.receiveShadow = true;
            
            const matrix = new THREE.Matrix4().fromArray(node.transform);
            resultBrush.applyMatrix4(matrix);
            resultBrush.updateMatrixWorld();
            return resultBrush;
        }
        return null;
    }
    
    rebuildScene() {
        this.modelGroup.clear();
        ProjectData.nodes.forEach(node => {
            if (node.isRoot) {
                const finalMesh = this.evaluateCSGTree(node);
                if (finalMesh) {
                    finalMesh.userData = { nodeId: node.id };
                    this.modelGroup.add(finalMesh);
                }
            }
        });
    }

    selectNodes(selectedNodes) {
        if (selectedNodes.length > 0) {
            const lastNode = selectedNodes[selectedNodes.length - 1];
            this.transformManager.attachToNode(lastNode);
        } else {
            this.transformManager.detach();
        }
        this.rebuildScene();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}