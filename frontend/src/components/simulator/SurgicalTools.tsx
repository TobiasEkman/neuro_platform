import React, { useRef } from 'react';
import { Box, Cylinder, Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SurgicalToolsProps {
  selectedTool: string | null;
  brainMesh: THREE.Mesh | null;
}

const SurgicalTools: React.FC<SurgicalToolsProps> = ({ selectedTool, brainMesh }) => {
  const toolRef = useRef<THREE.Group>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawPoints, setDrawPoints] = React.useState<number[][]>([]);
  const [currentLine, setCurrentLine] = React.useState<number[]>([]);
  const { camera, raycaster, mouse, gl } = useThree();

  useFrame(() => {
    if (toolRef.current && selectedTool && brainMesh) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(brainMesh, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        toolRef.current.position.copy(point);
        toolRef.current.position.y += 0.1;

        if (isDrawing && selectedTool === 'scalpel') {
          setCurrentLine(prev => {
            if (prev.length === 0) {
              return [point.x, point.y + 0.01, point.z];
            }
            return [...prev, point.x, point.y + 0.01, point.z];
          });
        }
      }
    }
  });

  const handlePointerDown = (e: THREE.Event) => {
    if ((e as any).button !== 0) return;
    e.stopPropagation();
    if (selectedTool === 'scalpel') {
      setIsDrawing(true);
      setCurrentLine([]);
      gl.domElement.style.cursor = 'none';
    }
  };

  const handlePointerUp = (e: THREE.Event) => {
    e.stopPropagation();
    if (selectedTool === 'scalpel' && currentLine.length > 0) {
      setDrawPoints(prev => [...prev, currentLine]);
      setCurrentLine([]);
      setIsDrawing(false);
      gl.domElement.style.cursor = 'auto';
    }
  };

  const Scalpel = () => (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Cylinder 
        args={[0.02, 0.02, 0.3, 8]} 
        position={[0, 0.15, 0]}
      >
        <meshStandardMaterial color="#666666" metalness={0.8} />
      </Cylinder>
      <Box 
        args={[0.01, 0.08, 0.02]} 
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color="#cccccc" metalness={0.9} />
      </Box>
    </group>
  );

  const IncisionLines = () => (
    <group>
      {drawPoints.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="red"
          lineWidth={5}
          transparent
          opacity={0.8}
        />
      ))}
      {currentLine.length > 0 && (
        <Line
          points={currentLine}
          color="red"
          lineWidth={5}
          transparent
          opacity={0.8}
        />
      )}
    </group>
  );

  const renderTool = () => {
    switch (selectedTool) {
      case 'scalpel':
        return <Scalpel />;
      case 'drill':
        return (
          <Cylinder args={[0.1, 0.1, 0.3, 32]}>
            <meshStandardMaterial color="#999999" metalness={0.6} />
          </Cylinder>
        );
      case 'forceps':
        return (
          <Box args={[0.05, 0.4, 0.05]}>
            <meshStandardMaterial color="#cccccc" metalness={0.7} />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <group 
        ref={toolRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {renderTool()}
      </group>
      <IncisionLines />
    </>
  );
};

export default SurgicalTools; 