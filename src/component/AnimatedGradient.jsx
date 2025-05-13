// AnimatedGradient.jsx — 3D Flowing Ribbon with Vertex Colors (Corrected)
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const AnimatedGradient = () => {
    const mountRef = useRef();

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 15);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.update();

        // 1. Define the path for the ribbon (you can animate this)
        const path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-5, 0, 0),
            new THREE.Vector3(-3, 2, 3),
            new THREE.Vector3(0, 1, -2),
            new THREE.Vector3(3, -2, 2),
            new THREE.Vector3(5, 1, 0)
        ]);

        // 2. Create the TubeGeometry
        const geometry = new THREE.TubeGeometry(
            path,       // The curve to extrude along
            100,        // Number of segments along the tube
            1,          // Radius of the tube
            8,          // Number of radial segments
            false       // Closed?
        );

        // 3. Create the material with vertex colors enabled
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide, // To see both sides of the ribbon
            transparent: true,
            opacity: 0.8 // Adjust for desired transparency
        });

        const colorStart = new THREE.Color('#f96ca3'); // Pink
        const colorEnd = new THREE.Color('#ffc2a1');   // Orange

        // 4. Assign vertex colors based on position along the ribbon
        const positionAttribute = geometry.attributes.position;
        const colors = [];
        const vertices = geometry.attributes.position.array;

        for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]);

            // Calculate approximate normalized position along the curve
            let minDistanceSq = Infinity;
            let closestT = 0;
            const segments = path.segments;
            const divisions = 100; // Increase for better accuracy

            for (let j = 0; j <= segments * divisions; j++) {
                const t = j / (segments * divisions);
                const point = path.getPointAt(t);
                const distanceSq = vertex.distanceToSquared(point);
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    closestT = t;
                }
            }

            const color = new THREE.Color().lerpColors(colorStart, colorEnd, closestT);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // 5. Create the mesh
        const ribbon = new THREE.Mesh(geometry, material);
        scene.add(ribbon);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        const animate = (time) => {
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
            mountRef.current.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
            geometry.dispose();
            material.dispose();
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh', backgroundColor: 'white' }} />;
};

export default AnimatedGradient;