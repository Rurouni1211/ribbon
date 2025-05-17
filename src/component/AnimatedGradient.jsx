import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const AnimatedGradient = () => {
    const mountRef = useRef(null);
    const [cameraInstance, setCameraInstance] = useState(null);
    const [, setTick] = useState(0);

    const initialCameraPos = { x: 6.2, y: -3.3, z: 1.0 };
    const cameraRef = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
    const groupRef = useRef(null);

    const initialGroupPos = { x: 5.00, y: 1.07, z: -5.00 };
    const initialGroupRot = { x: -0.09, y: -0.26, z: -0.85 };
    const initialGroupScale = { x: 1.59, y: 1.45, z: 2.80 };

    useEffect(() => {
        const currentMount = mountRef.current;
        const camera = cameraRef.current;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        camera.position.set(initialCameraPos.x, initialCameraPos.y, initialCameraPos.z);
        setCameraInstance(camera);

        const scene = new THREE.Scene();
        groupRef.current = new THREE.Group();
        groupRef.current.position.set(initialGroupPos.x, initialGroupPos.y, initialGroupPos.z);
        groupRef.current.rotation.set(initialGroupRot.x, initialGroupRot.y, initialGroupRot.z);
        groupRef.current.scale.set(initialGroupScale.x, initialGroupScale.y, initialGroupScale.z);
        scene.add(groupRef.current);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: 'highp' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        renderer.sortObjects = true;
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const clock = new THREE.Clock();

        const loader = new THREE.TextureLoader();
        const texture = loader.load('/6181758.jpg', () => {
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
                        pos.y += 0.01 * sin(uv.x * 6.0 + uTime * 0.2);
                        pos.z += 0.01 * cos(uv.y * 4.0 + uTime * 0.2);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                 
                fragmentShader: `
                    varying vec2 vUv;
                    uniform sampler2D uTexture;
                    uniform float uTime;
                    void main() {
                        vec2 uv = vUv * vec2(2.0, 0.8);
                        uv = clamp(uv, 0.0, 1.0);
                        uv += 0.0005 * vec2(sin(uTime), cos(uTime));
                        vec4 tex = texture2D(uTexture, uv);
 
                        float fadeX = smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.9, 1.0, uv.x));
                        float fadeY = smoothstep(0.0, 0.1, uv.y) * (1.0 - smoothstep(0.9, 1.0, uv.y));
                        float edgeFade = fadeX * fadeY;
                        vec3 fadeColor = vec3(0.1, 0.1, 0.15);

                        vec3 base = mix(fadeColor, tex.rgb, edgeFade);
                        float highlight = 0.1 * sin(vUv.y * 20.0 + uTime * 2.0);
                        vec3 finalColor = base + highlight;
                        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), tex.a * edgeFade * 0.85);

                    }
                `,
                uniforms: {
                    uTime: { value: 0.0 },
                    uTexture: { value: texture }
                },
               side: THREE.BackSide,
transparent: true,
alphaTest: 0.01,
depthWrite: false,
depthTest: true,
blending: THREE.NormalBlending,
polygonOffset: true,
polygonOffsetFactor: -1,
polygonOffsetUnits: -1,

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

        const materials = [makeMaterial(), makeMaterial(), makeMaterial()];
        const strandPaths = [
            braidCurve(pathRadius, strandOffsets[0], 0),
            braidCurve(pathRadius, strandOffsets[1], Math.PI * 2 / 3),
            braidCurve(pathRadius, strandOffsets[2], Math.PI * 4 / 3)
        ];

        strandPaths.forEach((curve, i) => {
           const geometry = new THREE.TubeGeometry(curve, 300, 0.2, 32, false);

            const mesh = new THREE.Mesh(geometry, materials[i]);
            mesh.renderOrder = i;
            groupRef.current.add(mesh);
        });

        const ambientLight = new THREE.AmbientLight(0xff1b6b, 0.5);
        scene.add(ambientLight);

        let animationFrameId;
        const animate = () => {
            if (materials[0].uniforms.uTime) {
                const time = clock.getElapsedTime();
                materials.forEach(mat => { mat.uniforms.uTime.value = time; });
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
            materials.forEach(mat => mat.dispose());
            if (texture) texture.dispose();
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }} />;
};

export default AnimatedGradient;
