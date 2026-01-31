'use client';

import { useState } from 'react';
import { Text, Sky, Cloud, Sparkles, Environment } from '@react-three/drei';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { VRInterface } from '../spatial-ui/VRInterface';
import { VRLocation } from './WorldManager';

export function Lobby({ onNavigate }: { onNavigate: (loc: VRLocation) => void }) {

  const handleConnect = (serviceId: string) => {
    switch (serviceId) {
      case 'meditation': onNavigate('meditation'); break;
      case 'music': onNavigate('music'); break;
      case 'astrology': onNavigate('astrology'); break;
      case 'satsang': console.log("Satsang room coming soon"); break;
    }
  };

  return (
    <>
      {/* Lighting & Environment */}
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 20, 10]} intensity={1.5} castShadow />

      {/* Divine Sky */}
      <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={6} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <Environment preset="sunset" />

      {/* Clouds for Depth */}
      <Cloud position={[-10, 5, -20]} opacity={0.5} speed={0.4} width={10} depth={1.5} segments={20} />
      <Cloud position={[10, 10, -15]} opacity={0.5} speed={0.4} width={10} depth={1.5} segments={20} />

      {/* Magical Atmosphere */}
      <Sparkles count={50} scale={12} size={4} speed={0.4} opacity={0.6} color="#FFD700" position={[0, 2, -5]} />

      {/* Teleportation Ground */}
      <TeleportFloor />

      {/* NEW SPATIAL UI */}
      {/* Placed at z=-2, y=1.5 (Eye level) */}
      <VRInterface
        onConnect={handleConnect}
        onDisconnect={() => { }} // No disconnect in lobby
        activeServiceId={null} // Lobby is always disconnected
      />

      {/* Welcome Text */}
      <Text position={[0, 3, -6]} fontSize={1.2} color="#FFFFFF" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#D4AF37">
        RRAASI UNIVERSE
      </Text>
    </>
  );
}

function TeleportFloor() {
  const { player } = useXR();
  const [intersection, setIntersection] = useState<THREE.Vector3 | null>(null);

  const onSelect = (e: any) => {
    if (e.intersection) {
      const { x, z } = e.intersection.point;
      // Move player to the teleport point at floor level (y = -2)
      player.position.set(x, -2, z);
    }
  };

  return (
    <>
      <Interactive
        onSelect={onSelect}
        onHover={(e: any) => setIntersection(e.intersection?.point)}
        onBlur={() => setIntersection(null)}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial
            color="#f0f0f0"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      </Interactive>

      {/* Teleport Selection Ring */}
      {intersection && (
        <mesh position={[intersection.x, -1.98, intersection.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.4, 32]} />
          <meshBasicMaterial color="#FFD700" opacity={0.8} transparent />
        </mesh>
      )}
    </>
  );
}
