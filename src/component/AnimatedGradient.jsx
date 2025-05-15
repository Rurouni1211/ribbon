import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const AnimatedGradient = () => {
    const mountRef = useRef(null);
    const [cameraInstance, setCameraInstance] = useState(null);
    const [, setTick] = useState(0);

    // Initial Camera Values
    const initialCameraPos = { x: 6.2, y: -3.3, z: 1.0 };

    const cameraRef = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
    const groupRef = useRef(null);

    // Initial Braid Transform Values
    const initialGroupPos = { x: 5.00, y: 1.07, z: -5.00 };
    const initialGroupRot = { x: -0.09, y: -0.26, z: -0.85 }; // Radians
    const initialGroupScale = { x: 1.59, y: 1.45, z: 2.80 };

    useEffect(() => {
        const currentMount = mountRef.current;
        const camera = cameraRef.current;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // --- SET INITIAL CAMERA POSITION ---
        camera.position.set(initialCameraPos.x, initialCameraPos.y, initialCameraPos.z);
        setCameraInstance(camera);

        const scene = new THREE.Scene();

        groupRef.current = new THREE.Group();
        // --- SET INITIAL GROUP TRANSFORM ---
        groupRef.current.position.set(initialGroupPos.x, initialGroupPos.y, initialGroupPos.z);
        groupRef.current.rotation.set(initialGroupRot.x, initialGroupRot.y, initialGroupRot.z);
        groupRef.current.scale.set(initialGroupScale.x, initialGroupScale.y, initialGroupScale.z);
        scene.add(groupRef.current);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const clock = new THREE.Clock();

        const loader = new THREE.TextureLoader();
        const texture = loader.load('/images (4).jpg', () => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
        });

        const makeMaterial = () =>
            new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec2 vUv;
                    uniform float uTime;
                    void main() {
                        vUv = uv;
                        vec3 pos = position;
                        pos.y += 0.04 * sin(uv.x * 6.0 + uTime * 0.6) * smoothstep(0.3, 0.7, uv.y);
                        pos.z += 0.1 * cos(uv.y * 4.0 + uTime * 0.4);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform sampler2D uTexture;
                    uniform float uTime;
                    void main() {
                        vec2 uv = fract(vUv * vec2(2.0, 0.8));
                        uv += 0.0005 * vec2(sin(uTime), cos(uTime));
                        vec4 tex = texture2D(uTexture, vec2(uv.y, uv.x)); 
                        float fadeX = smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.9, 1.0, uv.x));
                        float fadeY = smoothstep(0.0, 0.1, uv.y) * (1.0 - smoothstep(0.9, 1.0, uv.y));
                        float edgeFade = fadeX * fadeY;
                        vec3 fadeColor = vec3(1.0, 0.95, 0.98);
                        vec3 base = mix(fadeColor, tex.rgb, edgeFade);
                        float highlight = 0.1 * sin(vUv.y * 20.0 + uTime * 2.0);
                        vec3 finalColor = base + highlight;
                        gl_FragColor = vec4(finalColor, tex.a * edgeFade * 0.85);
                    }
                `,
                uniforms: {
                    uTime: { value: 0.0 },
                    uTexture: { value: texture }
                },
                transparent: true,
                blending: THREE.NormalBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });

        const braidCurve = (radius, offset, phase) => {
            const points = [];
            const len = 300;
            for (let i = 0; i < len; i++) {
                const t = i / (len - 1);
                const angle = t * Math.PI * 6 + phase;
                const x = Math.sin(angle) * radius + offset.x + t * 5.0;
                const y = -t * 10.0;
                const z = Math.cos(angle) * radius + offset.z + t * 5.0;
                points.push(new THREE.Vector3(x, y, z));
            }
            return new THREE.CatmullRomCurve3(points);
        };

        const pathRadius = 0.2;
        const strandOffsets = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.04, 0, -0.04),
            new THREE.Vector3(-0.04, 0, 0.04)
        ];

        const sharedMaterial = makeMaterial();
        const strandPaths = [
            braidCurve(pathRadius, strandOffsets[0], 0),
            braidCurve(pathRadius, strandOffsets[1], Math.PI * 2 / 3),
            braidCurve(pathRadius, strandOffsets[2], Math.PI * 4 / 3)
        ];

        strandPaths.forEach((curve) => {
            const geometry = new THREE.TubeGeometry(curve, 300, 0.2, 32, false);
            const mesh = new THREE.Mesh(geometry, sharedMaterial);
            groupRef.current.add(mesh);
        });

        const ambientLight = new THREE.AmbientLight(0xff1b6b, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        scene.add(directionalLight);

        let animationFrameId;
        const animate = () => {
            if (sharedMaterial.uniforms.uTime) {
                sharedMaterial.uniforms.uTime.value = clock.getElapsedTime();
            }
            controls.update();
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement);
            }
            if (groupRef.current) {
                groupRef.current.traverse(object => {
                    if (object.isMesh && object.geometry) {
                        object.geometry.dispose();
                    }
                });
                scene.remove(groupRef.current);
            }
            if (sharedMaterial) sharedMaterial.dispose();
            if (texture) texture.dispose();
            renderer.dispose();
            if (controls) controls.dispose();
        };
    }, []); // Empty dependency array ensures this runs once on mount

    const handleCameraSliderChange = (axis) => (e) => {
        const val = parseFloat(e.target.value);
        if (!cameraRef.current) return;
        cameraRef.current.position[axis] = val;
        setTick(t => t + 1);
    };

    const handleGroupTransformChange = (type, axis) => (e) => {
        if (!groupRef.current) return;
        const value = parseFloat(e.target.value);
        const currentGroup = groupRef.current;
        switch (type) {
            case 'position': currentGroup.position[axis] = value; break;
            case 'rotation': currentGroup.rotation[axis] = value; break;
            case 'scale': currentGroup.scale[axis] = value; break;
            default: break;
        }
        setTick(t => t + 1);
    };
    
    const camX = cameraInstance ? cameraInstance.position.x.toFixed(1) : initialCameraPos.x.toFixed(1);
    const camY = cameraInstance ? cameraInstance.position.y.toFixed(1) : initialCameraPos.y.toFixed(1);
    const camZ = cameraInstance ? cameraInstance.position.z.toFixed(1) : initialCameraPos.z.toFixed(1);

    const groupPosX = groupRef.current ? groupRef.current.position.x.toFixed(2) : initialGroupPos.x.toFixed(2);
    const groupPosY = groupRef.current ? groupRef.current.position.y.toFixed(2) : initialGroupPos.y.toFixed(2);
    const groupPosZ = groupRef.current ? groupRef.current.position.z.toFixed(2) : initialGroupPos.z.toFixed(2);
    const groupRotX = groupRef.current ? groupRef.current.rotation.x.toFixed(2) : initialGroupRot.x.toFixed(2);
    const groupRotY = groupRef.current ? groupRef.current.rotation.y.toFixed(2) : initialGroupRot.y.toFixed(2);
    const groupRotZ = groupRef.current ? groupRef.current.rotation.z.toFixed(2) : initialGroupRot.z.toFixed(2);
    const groupScaleX = groupRef.current ? groupRef.current.scale.x.toFixed(2) : initialGroupScale.x.toFixed(2);
    const groupScaleY = groupRef.current ? groupRef.current.scale.y.toFixed(2) : initialGroupScale.y.toFixed(2);
    const groupScaleZ = groupRef.current ? groupRef.current.scale.z.toFixed(2) : initialGroupScale.z.toFixed(2);

    return (
        <>
            <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }} />
            <div style={{
                position: 'absolute', top: 10, left: 10, background: 'rgba(255, 255, 255, 0.9)',
                padding: '10px', borderRadius: '6px', zIndex: 10, display: 'flex', gap: '20px'
            }}>
                <div>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Camera Position</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label> X: <input type="range" min="-10" max="10" step="0.1" defaultValue={initialCameraPos.x} onInput={handleCameraSliderChange('x')} /> {camX} </label>
                        <label> Y: <input type="range" min="-10" max="10" step="0.1" defaultValue={initialCameraPos.y} onInput={handleCameraSliderChange('y')} /> {camY} </label>
                        <label> Z: <input type="range" min="1" max="20" step="0.1" defaultValue={initialCameraPos.z} onInput={handleCameraSliderChange('z')} /> {camZ} </label>
                    </div>
                </div>
                <div>
                    <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Braid Transform</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <strong>Position:</strong>
                        <label> X: <input type="range" min="-5" max="5" step="0.01" defaultValue={initialGroupPos.x} onInput={handleGroupTransformChange('position', 'x')} /> {groupPosX} </label>
                        <label> Y: <input type="range" min="-5" max="5" step="0.01" defaultValue={initialGroupPos.y} onInput={handleGroupTransformChange('position', 'y')} /> {groupPosY} </label>
                        <label> Z: <input type="range" min="-5" max="5" step="0.01" defaultValue={initialGroupPos.z} onInput={handleGroupTransformChange('position', 'z')} /> {groupPosZ} </label>
                        <strong>Rotation (Radians):</strong>
                        <label> X: <input type="range" min="-3.14" max="3.14" step="0.01" defaultValue={initialGroupRot.x} onInput={handleGroupTransformChange('rotation', 'x')} /> {groupRotX} </label>
                        <label> Y: <input type="range" min="-3.14" max="3.14" step="0.01" defaultValue={initialGroupRot.y} onInput={handleGroupTransformChange('rotation', 'y')} /> {groupRotY} </label>
                        <label> Z: <input type="range" min="-3.14" max="3.14" step="0.01" defaultValue={initialGroupRot.z} onInput={handleGroupTransformChange('rotation', 'z')} /> {groupRotZ} </label>
                        <strong>Scale:</strong>
                        <label> X: <input type="range" min="0.1" max="3" step="0.01" defaultValue={initialGroupScale.x} onInput={handleGroupTransformChange('scale', 'x')} /> {groupScaleX} </label>
                        <label> Y: <input type="range" min="0.1" max="3" step="0.01" defaultValue={initialGroupScale.y} onInput={handleGroupTransformChange('scale', 'y')} /> {groupScaleY} </label>
                        <label> Z: <input type="range" min="0.1" max="3" step="0.01" defaultValue={initialGroupScale.z} onInput={handleGroupTransformChange('scale', 'z')} /> {groupScaleZ} </label>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AnimatedGradient;