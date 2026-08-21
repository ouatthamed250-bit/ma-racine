'use client';

// Trophée 3D (vraie géométrie WebGL, pas une image), affiché uniquement lors
// d'une victoire à 3 étoiles. Composant séparé pour n'être monté (et le
// contexte WebGL avec lui) que pendant que la modale de victoire l'exige.

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';

function TrophyMesh() {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Coupe (bol) */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.5, 0.24, 0.6, 28]} />
        <meshStandardMaterial color="#FFD866" metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Col */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.09, 0.13, 0.35, 20]} />
        <meshStandardMaterial color="#F09000" metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Socle haut */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 0.14, 24]} />
        <meshStandardMaterial color="#FFD866" metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Socle bas */}
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.5, 0.56, 0.14, 24]} />
        <meshStandardMaterial color="#F09000" metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Anses */}
      <mesh position={[-0.62, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.045, 12, 24, Math.PI * 1.3]} />
        <meshStandardMaterial color="#FFD866" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0.62, 0.5, 0]} rotation={[0, Math.PI, -Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.045, 12, 24, Math.PI * 1.3]} />
        <meshStandardMaterial color="#FFD866" metalness={0.9} roughness={0.22} />
      </mesh>
    </group>
  );
}

export default function TrophyScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 3], fov: 40 }}
      style={{ width: 150, height: 150 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <pointLight position={[-2, 1, 2]} intensity={0.6} color="#fff3cf" />
      <Suspense fallback={null}>
        <TrophyMesh />
      </Suspense>
    </Canvas>
  );
}
