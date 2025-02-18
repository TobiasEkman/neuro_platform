import { ReactThreeFiber } from '@react-three/fiber'
import * as THREE from 'three'
import { Object3D, Material, Texture } from 'three'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Basic elements
      group: ReactThreeFiber.Object3DNode<THREE.Group, typeof THREE.Group>
      
      // Materials
      meshStandardMaterial: ReactThreeFiber.MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
      meshBasicMaterial: ReactThreeFiber.MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>
      
      // Lights
      ambientLight: ReactThreeFiber.LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      pointLight: ReactThreeFiber.LightNode<THREE.PointLight, typeof THREE.PointLight>
      
      // Geometries
      sphereGeometry: ReactThreeFiber.BufferGeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
      boxGeometry: ReactThreeFiber.BufferGeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
      cylinderGeometry: ReactThreeFiber.BufferGeometryNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
      
      // Meshes
      mesh: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      sphere: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      box: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      cylinder: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      
      // Lines
      line: ReactThreeFiber.Object3DNode<THREE.Line, typeof THREE.Line>
      lineSegments: ReactThreeFiber.Object3DNode<THREE.LineSegments, typeof THREE.LineSegments>
      
      // Primitive
      primitive: ReactThreeFiber.Object3DNode<THREE.Object3D, typeof THREE.Object3D>

      // Additional elements from @react-three/drei
      Sphere: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      Box: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      Cylinder: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      Line: ReactThreeFiber.Object3DNode<THREE.Line, typeof THREE.Line>
      Canvas: ReactThreeFiber.Object3DNode<THREE.Scene, typeof THREE.Scene>

      // Lights with capitalized names
      AmbientLight: ReactThreeFiber.LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      PointLight: ReactThreeFiber.LightNode<THREE.PointLight, typeof THREE.PointLight>

      // Materials with capitalized names
      MeshStandardMaterial: ReactThreeFiber.MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
      MeshBasicMaterial: ReactThreeFiber.MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>

      // New elements
      bufferGeometry: any;
      lineBasicMaterial: any;
      pointsMaterial: any;
      points: any;
    }
  }
}

declare module '@react-three/fiber' {
  export interface ThreeElements {
    mesh: any;
    meshStandardMaterial: any;
    group: any;
    primitive: any;
    bufferGeometry: any;
    lineSegments: any;
    lineBasicMaterial: any;
    pointsMaterial: any;
    points: any;
  }
} 