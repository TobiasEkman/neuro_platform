import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ThreeJSViewerProps {
  dicomPath?: string;
  approach: string;
  highlights: string[];
}

const ThreeJSViewer: React.FC<ThreeJSViewerProps> = ({ dicomPath, approach, highlights }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Setup scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Set camera position
    camera.position.z = 5;

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      mount?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update scene when props change
  useEffect(() => {
    if (!sceneRef.current || !dicomPath) return;

    // Clear existing meshes
    sceneRef.current.clear();

    // Load DICOM data and create 3D visualization
    // This is a placeholder - actual implementation would use DICOM loader
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    sceneRef.current.add(cube);

  }, [dicomPath, approach, highlights]);

  return <div ref={mountRef} style={{ width: '100%', height: '500px' }} />;
};

export default ThreeJSViewer; 