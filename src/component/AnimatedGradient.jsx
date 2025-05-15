// AnimatedGradient.jsx — 3-Strand Braided Brush-Stroke Ribbon
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const AnimatedGradient = () => {
    const mountRef = useRef();
    const [cameraRef, setCameraRef] = useState(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
    const [, setTick] = useState(0);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = cameraRef;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        camera.position.set(2.6, -1.7, 3.2);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0xffffff);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.update();

        const clock = new THREE.Clock();

    const makeMaterial = () => new THREE.ShaderMaterial({
    vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(uv.y * 200.0 + uTime * 2.0) * 0.04; // flowing stroke effect
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
            // Stripe effect for texture
            float stripe = smoothstep(0.4, 0.6, fract(vUv.y * 60.0 + uTime * 0.5));

            // Define pink-to-peach gradient
            vec3 pink = vec3(1.0, 0.411, 0.706); // #FF69B4
            vec3 peach = vec3(1.0, 0.855, 0.725); // #FFDAB9
            // Interpolate between pink and peach based on vUv.y with a slight time-based shift
            float gradientMix = sin(vUv.y * 3.0 + uTime * 0.2) * 0.5 + 0.5;
            vec3 baseColor = mix(pink, peach, gradientMix);

            // Add subtle variation for a brushstroke effect
            vec3 color = baseColor + stripe * 0.1; // Reduced stripe intensity for subtlety
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    uniforms: {
        uTime: { value: 0.0 }
    },
    transparent: false,
    side: THREE.DoubleSide
});
        const braidCurve = (radius, offset, phase) => {
            const points = [];
            const len = 300;
            for (let i = 0; i < len; i++) {
                const t = i / len;
                const angle = t * Math.PI * 6 + phase;
                const x = Math.sin(angle) * radius + offset.x + t * 5.0;
                const y = -t * 10.0;
                const z = Math.cos(angle) * radius + offset.z + t * 5.0;
                points.push(new THREE.Vector3(x, y, z));
            }
            return new THREE.CatmullRomCurve3(points);
        };

        const radius = 0.2;
        const strandOffsets = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.04, 0, -0.04),
            new THREE.Vector3(-0.04, 0, 0.04)
        ];

        const materials = [makeMaterial(), makeMaterial(), makeMaterial()];

        const strands = [
            braidCurve(radius, strandOffsets[0], 0),
            braidCurve(radius, strandOffsets[1], Math.PI * 2 / 3),
            braidCurve(radius, strandOffsets[2], Math.PI * 4 / 3)
        ];

        strands.forEach((curve, i) => {
            const geometry = new THREE.TubeGeometry(curve, 600, 0.24, 32, false);
            const mesh = new THREE.Mesh(geometry, materials[i]);
            scene.add(mesh);
        });

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        const animate = () => {
            const elapsed = clock.getElapsedTime();
            materials.forEach(mat => {
                mat.uniforms.uTime.value = elapsed;
            });
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            if (mountRef.current?.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    const handleSliderChange = (axis) => (e) => {
        const val = parseFloat(e.target.value);
        if (!cameraRef) return;
        cameraRef.position[axis] = val;
        cameraRef.updateProjectionMatrix();
        setTick(t => t + 1);
    };

    return (
        <>
            <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
            <div style={{ position: 'absolute', top: 10, left: 10, background: '#3b3a3a', padding: '10px', borderRadius: '6px' }}>
                <label>Camera Position</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label>X <input type="range" min="-10" max="10" step="0.1" defaultValue="0" onInput={handleSliderChange('x')} /> {cameraRef?.position.x.toFixed(1)}</label>
                    <label>Y <input type="range" min="-10" max="10" step="0.1" defaultValue="2" onInput={handleSliderChange('y')} /> {cameraRef?.position.y.toFixed(1)}</label>
                    <label>Z <input type="range" min="2" max="15" step="0.1" defaultValue="7" onInput={handleSliderChange('z')} /> {cameraRef?.position.z.toFixed(1)}</label>
                </div>
            </div>
        </>
    );
};

export default AnimatedGradient;
