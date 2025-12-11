import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from './three-bvh-csg.js';

let scene, camera, renderer, controls;
let bearingGroup;
let isRotating = true;
let currentStep = 4; // 默认显示最终效果

// 材质定义
const materialSteel = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.9,    // 高金属感
    roughness: 0.2,    // 光滑
    clearcoat: 1.0,    // 清漆层，增加质感
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
});

const materialBalls = new THREE.MeshPhysicalMaterial({
    color: 0xe0e0e0,
    metalness: 1.0,
    roughness: 0.1,    // 极度光滑，像镜子
    clearcoat: 1.0
});

init();
animate();

function init() {
    const canvas = document.querySelector('#glCanvas');
    const container = canvas.parentElement;

    // 1. 场景设置 (Apple Studio Style)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c1c1e);
    scene.fog = new THREE.Fog(0x1c1c1e, 10, 50);

    // 2. 相机
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 5, 8); // 完美视角

    // 3. 渲染器
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // 4. 灯光系统 (Studio Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const rimLight = new THREE.SpotLight(0x4455ff, 5.0);
    rimLight.position.set(-5, 0, -5);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    // 5. 地板 (隐形阴影捕捉)
    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.2, color: 0x000000 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1.5; // 放在轴承下方
    plane.receiveShadow = true;
    scene.add(plane);

    const grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
    grid.position.y = -1.5;
    scene.add(grid);

    // 6. 控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 7. 生成轴承模型
    createBearing();

    // 8. 绑定 UI 事件
    setupUI();

    window.addEventListener('resize', onWindowResize);
}

function createBearing() {
    if (bearingGroup) scene.remove(bearingGroup);
    bearingGroup = new THREE.Group();
    scene.add(bearingGroup);

    // === CSG 建模核心逻辑 ===
    const evaluator = new Evaluator();

    // 参数
    const outerRadius = 3.0;
    const innerRadius = 1.5;
    const height = 1.5;
    const ballRadius = 0.55;
    const grooveRadius = 0.6; // 轨道凹槽半径

    // 1. 外圈 (Outer Ring)
    // 原始圆柱 - 内孔
    let brushOuterRaw = new Brush(new THREE.CylinderGeometry(outerRadius, outerRadius, height, 64), materialSteel);
    let brushOuterHole = new Brush(new THREE.CylinderGeometry(outerRadius - 0.5, outerRadius - 0.5, height + 0.1, 64), materialSteel);
    let outerRing = evaluator.evaluate(brushOuterRaw, brushOuterHole, SUBTRACTION);

    // 2. 内圈 (Inner Ring)
    // 原始圆柱 - 内孔
    let brushInnerRaw = new Brush(new THREE.CylinderGeometry(innerRadius + 0.5, innerRadius + 0.5, height, 64), materialSteel);
    let brushInnerHole = new Brush(new THREE.CylinderGeometry(innerRadius, innerRadius, height + 0.1, 64), materialSteel);
    let innerRing = evaluator.evaluate(brushInnerRaw, brushInnerHole, SUBTRACTION);

    // 3. 轨道切割 (Groove Cut) - CSG 的精髓
    // 创建一个圆环体 (Torus) 用来充当“刀具”，切出滚珠轨道
    // TorusGeometry(radius, tube, radialSegments, tubularSegments)
    // 这里的 radius 是圆环中心半径，tube 是管子粗细
    const grooveCutterGeo = new THREE.TorusGeometry((outerRadius + innerRadius) / 2, grooveRadius, 32, 100);
    const brushGrooveCutter = new Brush(grooveCutterGeo, materialSteel);
    brushGrooveCutter.rotation.x = Math.PI / 2; // 躺平

    // 对外圈切槽
    const outerRingFinal = evaluator.evaluate(outerRing, brushGrooveCutter, SUBTRACTION);
    outerRingFinal.castShadow = true;
    outerRingFinal.receiveShadow = true;
    outerRingFinal.userData = { type: 'outer' };

    // 对内圈切槽
    const innerRingFinal = evaluator.evaluate(innerRing, brushGrooveCutter, SUBTRACTION);
    innerRingFinal.castShadow = true;
    innerRingFinal.receiveShadow = true;
    innerRingFinal.userData = { type: 'inner' };

    // 4. 滚珠 (Balls)
    const ballsGroup = new THREE.Group();
    const ballCount = 8;
    const ringRadius = (outerRadius + innerRadius) / 2;
    
    for (let i = 0; i < ballCount; i++) {
        const angle = (i / ballCount) * Math.PI * 2;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), materialBalls);
        ball.position.set(Math.cos(angle) * ringRadius, 0, Math.sin(angle) * ringRadius);
        ball.castShadow = true;
        ball.receiveShadow = true;
        ballsGroup.add(ball);
    }

    // 根据当前步骤组装场景
    updateSceneBasedOnStep(outerRing, innerRing, outerRingFinal, innerRingFinal, ballsGroup);
}

function updateSceneBasedOnStep(outerRaw, innerRaw, outerFinal, innerFinal, balls) {
    bearingGroup.clear();

    if (currentStep === 1) {
        // 第一步：原始圆柱
        // 为了演示，我们重新生成简单的圆柱
        const geo1 = new THREE.CylinderGeometry(3, 3, 1.5, 64);
        const mesh1 = new THREE.Mesh(geo1, materialSteel);
        mesh1.castShadow = true;
        bearingGroup.add(mesh1);
    } 
    else if (currentStep === 2) {
        // 第二步：基础打孔 (未切槽)
        // 这里我们直接用 outerRaw 和 innerRaw (虽然它们是 Brush，但 Three-bvh-csg 的 Brush 继承自 Mesh，可以直接显示)
        // 为了显示清晰，重新赋材质
        outerRaw.material = materialSteel;
        innerRaw.material = materialSteel;
        bearingGroup.add(outerRaw);
        bearingGroup.add(innerRaw);
    }
    else if (currentStep === 3) {
        // 第三步：切槽后 (Grooved Rings)
        bearingGroup.add(outerFinal);
        bearingGroup.add(innerFinal);
    }
    else if (currentStep === 4) {
        // 第四步：最终组装
        bearingGroup.add(outerFinal);
        bearingGroup.add(innerFinal);
        bearingGroup.add(balls);
    }
}

function setupUI() {
    // 旋转控制
    document.getElementById('btn-rotate').onclick = function() {
        isRotating = !isRotating;
        this.classList.toggle('active', isRotating);
        this.innerHTML = isRotating ? '<i class="fa-solid fa-pause"></i> Stop Rotate' : '<i class="fa-solid fa-arrows-rotate"></i> Auto Rotate';
    };

    // 线框模式
    let isWireframe = false;
    document.getElementById('btn-wireframe').onclick = function() {
        isWireframe = !isWireframe;
        materialSteel.wireframe = isWireframe;
        materialBalls.wireframe = isWireframe;
        this.classList.toggle('active', isWireframe);
    };

    // 步骤切换
    const steps = [1, 2, 3, 4];
    steps.forEach(step => {
        document.getElementById(`step-${step}`).onclick = function() {
            currentStep = step;
            // 更新按钮状态
            steps.forEach(s => document.getElementById(`step-${s}`).classList.remove('active'));
            this.classList.add('active');
            
            // 更新状态文字
            const texts = [
                "Raw Geometry",
                "Boolean Subtract (Bore)",
                "Boolean Subtract (Groove)",
                "Final Assembly"
            ];
            document.getElementById('status-text').textContent = texts[step-1];

            // 重建模型
            createBearing();
        };
    });
}

function onWindowResize() {
    const container = renderer.domElement.parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (isRotating && bearingGroup) {
        bearingGroup.rotation.y += 0.005;
        bearingGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.1; // 轻微的晃动展示反光
    }
    
    controls.update();
    renderer.render(scene, camera);
}