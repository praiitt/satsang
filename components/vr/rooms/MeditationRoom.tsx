'use client';

import { Sky, Environment, Sparkles, Cloud, Float, Text } from '@react-three/drei';
import { Interactive, useXR } from '@react-three/xr';
import { useState } from 'react';
import * as THREE from 'three';
import { Button } from '../../spatial-ui/Button';
import { Panel } from '../../spatial-ui/Panel';
import { Root } from '@react-three/uikit';
import { ActiveSession } from '../ActiveSession';
import { AppConfig, APP_CONFIG_DEFAULTS } from '../../../app-config';

const MEDITATION_CONFIG: AppConfig = {
    ...APP_CONFIG_DEFAULTS,
    agentName: 'meditation-guru',
    pageTitle: 'Meditation',
    metadata: { guruId: 'meditation' }
};

export function MeditationRoom({ onExit }: { onExit: () => void }) {
    return (
        <>
            {/* Active LiveKit Session */}
            <ActiveSession config={MEDITATION_CONFIG} onDisconnect={onExit} />

            {/* Atmosphere */}
            <Sky sunPosition={[0, 10, -100]} turbidity={10} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />
            <Environment preset="park" />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />

            {/* Floating Particles for Zen vibe */}
            <Sparkles count={100} scale={15} size={2} speed={0.2} opacity={0.5} color="#ccffcc" position={[0, 2, 0]} />

            {/* Clouds */}
            <Cloud position={[0, 15, -10]} opacity={0.3} speed={0.1} />

            {/* Ground - Grass */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial
                    color="#2d5a27"
                    roughness={1}
                    metalness={0}
                />
            </mesh>

            {/* Decor - Simple Trees (Cones) */}
            <Tree position={[-5, -2, -8]} scale={1.5} />
            <Tree position={[5, -2, -8]} scale={1.2} />
            <Tree position={[-8, -2, -5]} scale={1.8} />

            {/* Guru Placeholder */}
            <mesh position={[0, 0, -4]}>
                <sphereGeometry args={[0.8, 32, 32]} />
                <meshStandardMaterial color="#ffccaa" roughness={0.5} />
            </mesh>
            <Text position={[0, 1.2, -4]} fontSize={0.2} color="white" anchorX="center" anchorY="bottom">
                Meditation Guru
            </Text>

            {/* Exit UI */}
            <Root position={[0, 1.5, -2]} sizeX={1} sizeY={0.5} flexDirection="row" justifyContent="center">
                <Panel width={200} height={100} alignItems="center" justifyContent="center">
                    <Button label="Exit to Lobby" onClick={onExit} />
                </Panel>
            </Root>

            {/* Teleport Floor */}
            <TeleportFloor />
        </>
    );
}

function Tree({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
    return (
        <group position={position} scale={scale}>
            {/* Trunk */}
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.2, 0.3, 2]} />
                <meshStandardMaterial color="#5c4033" />
            </mesh>
            {/* Leaves */}
            <mesh position={[0, 2.5, 0]}>
                <coneGeometry args={[1.5, 3]} />
                <meshStandardMaterial color="#228b22" />
            </mesh>
        </group>
    );
}

function TeleportFloor() {
    const { player } = useXR();
    const [intersection, setIntersection] = useState<THREE.Vector3 | null>(null);

    const onSelect = (e: any) => {
        if (e.intersection) {
            const { x, z } = e.intersection.point;
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
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]} receiveShadow visible={false}>
                    {/* Invisible plane just above ground for teleport detection */}
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>
            </Interactive>

            {intersection && (
                <mesh position={[intersection.x, -1.95, intersection.z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.2, 0.4, 32]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
                </mesh>
            )}
        </>
    );
}
