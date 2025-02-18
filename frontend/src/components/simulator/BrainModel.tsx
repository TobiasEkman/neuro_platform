import React, { useRef } from 'react';
import { Sphere, Box } from '@react-three/drei';
import { useFrame, Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface BrainModelProps {
  onMeshReady?: (mesh: THREE.Mesh) => void;
}

const BrainModel: React.FC<BrainModelProps> = ({ onMeshReady }) => {
  const brainRef = useRef<THREE.Group>(null);
  const brainMeshRef = useRef<THREE.Mesh>(null);
  const [hoveredPart, setHoveredPart] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (brainMeshRef.current && onMeshReady) {
      onMeshReady(brainMeshRef.current);
    }
  }, [onMeshReady]);

  useFrame((state) => {
    if (brainRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.02;
      brainRef.current.scale.setScalar(1 + pulse);
    }
  });

  const handlePointerOver = (part: string) => (e: THREE.Event) => {
    e.stopPropagation();
    setHoveredPart(part);
  };

  const handlePointerOut = (e: THREE.Event) => {
    e.stopPropagation();
    setHoveredPart(null);
  };

  return (
    <group ref={brainRef}>
      {/* Main brain mass */}
      <Sphere 
        ref={brainMeshRef}
        args={[1, 32, 32]} 
        onPointerOver={handlePointerOver('cerebrum')}
        onPointerOut={handlePointerOut}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial 
          color={hoveredPart === 'cerebrum' ? '#ffb6b6' : '#ff9999'} 
          roughness={0.7} 
          metalness={0.1}
          emissive={hoveredPart === 'cerebrum' ? '#ff0000' : '#000000'}
          emissiveIntensity={hoveredPart === 'cerebrum' ? 0.2 : 0}
        />
      </Sphere>

      {/* Cerebellum */}
      <Sphere 
        args={[0.4, 32, 32]} 
        position={[0, -0.7, 0]}
        onPointerOver={handlePointerOver('cerebellum')}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial 
          color={hoveredPart === 'cerebellum' ? '#ffb6b6' : '#ff8888'} 
          roughness={0.7} 
          metalness={0.1}
          emissive={hoveredPart === 'cerebellum' ? '#ff0000' : '#000000'}
          emissiveIntensity={hoveredPart === 'cerebellum' ? 0.2 : 0}
        />
      </Sphere>

      {/* Brain stem */}
      <Box 
        args={[0.2, 0.4, 0.2]} 
        position={[0, -1.1, 0]}
        onPointerOver={handlePointerOver('brainstem')}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial 
          color={hoveredPart === 'brainstem' ? '#ffb6b6' : '#ff8888'} 
          roughness={0.7} 
          metalness={0.1}
          emissive={hoveredPart === 'brainstem' ? '#ff0000' : '#000000'}
          emissiveIntensity={hoveredPart === 'brainstem' ? 0.2 : 0}
        />
      </Box>

      {/* Sulci details */}
      {[...Array(8)].map((_, i) => (
        <Box
          key={i}
          args={[0.05, 0.4, 0.05]}
          position={[
            Math.sin(i * Math.PI / 4) * 0.7,
            0.5,
            Math.cos(i * Math.PI / 4) * 0.7
          ]}
          rotation={[0, i * Math.PI / 4, 0]}
        >
          <meshStandardMaterial
            color="#e88888"
            roughness={0.9}
            metalness={0.1}
          />
        </Box>
      ))}
    </group>
  );
};

export default BrainModel; 