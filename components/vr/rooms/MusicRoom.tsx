'use client';

import { Stars, Text, Float, Box, Torus } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Button } from '../../spatial-ui/Button';
import { Panel } from '../../spatial-ui/Panel';
import { Root } from '@react-three/uikit';
import { ActiveSession } from '../ActiveSession';
import { AppConfig, APP_CONFIG_DEFAULTS } from '../../../app-config';

const MUSIC_CONFIG: AppConfig = {
    ...APP_CONFIG_DEFAULTS,
    agentName: 'music-guru',
    pageTitle: 'Divine Music',
    metadata: { guruId: 'music' }
};

export function MusicRoom({ onExit }: { onExit: () => void }) {
    return (
        <>
            {/* Active LiveKit Session */}
            <ActiveSession config={MUSIC_CONFIG} onDisconnect={onExit} />

            {/* Atmosphere - Dark Cosmic/Neon */}
            <color attach="background" args={['#050510']} />
            <fog attach="fog" args={['#050510', 5, 30]} />
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 10, 0]} intensity={1} color="#ff00ff" />
            <pointLight position={[0, -10, 0]} intensity={1} color="#00ffff" />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* Visualizer Bars (Static for now, could be animated) */}
            <VisualizerBars />

            {/* Floating Geometric Shapes */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <Torus args={[3, 0.1, 16, 100]} position={[0, 2, -10]} rotation={[Math.PI / 2, 0, 0]}>
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} toneMapped={false} />
                </Torus>
            </Float>

            <Float speed={3} rotationIntensity={1} floatIntensity={0.5}>
                <Torus args={[5, 0.1, 16, 100]} position={[0, 2, -15]} rotation={[0, 0, Math.PI / 4]}>
                    <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={2} toneMapped={false} />
                </Torus>
            </Float>

            {/* Ground - Grid */}
            <gridHelper args={[100, 100, 0xff00ff, 0x444444]} position={[0, -2, 0]} />

            {/* Exit UI */}
            <Root position={[0, 1.5, -2]} sizeX={1} sizeY={0.5} flexDirection="row" justifyContent="center">
                <Panel width={200} height={100} alignItems="center" justifyContent="center">
                    <Button label="Exit to Lobby" onClick={onExit} />
                </Panel>
            </Root>
        </>
    );
}

function VisualizerBars() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.children.forEach((mesh, i) => {
                const time = state.clock.getElapsedTime();
                // Simulating audio reaction with sine waves
                const scaleY = 1 + Math.sin(time * 2 + i * 0.5) * 2;
                mesh.scale.y = Math.max(0.5, scaleY);
            });
        }
    });

    return (
        <group ref={groupRef} position={[0, -2, -8]}>
            {Array.from({ length: 10 }).map((_, i) => (
                <mesh key={i} position={[(i - 4.5) * 1.5, 1.5, 0]}>
                    <boxGeometry args={[1, 3, 1]} />
                    <meshStandardMaterial
                        color={new THREE.Color().setHSL(i / 10, 1, 0.5)}
                        emissive={new THREE.Color().setHSL(i / 10, 1, 0.5)}
                        emissiveIntensity={0.5}
                    />
                </mesh>
            ))}
        </group>
    );
}
