'use client';

import { useState, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import { RoomEvent, Track } from 'livekit-client';
import { useRoom } from '../../hooks/useRoom';
import { AppConfig } from '../../app-config';

export function ActiveSession({ config, onDisconnect, autoConnect = true }: { config: AppConfig, onDisconnect?: () => void, autoConnect?: boolean }) {
    const { startSession, endSession, isSessionActive, room } = useRoom(config);
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        if (autoConnect) {
            startSession();
            setStatus('Connecting to ' + config.pageTitle + '...');
        }
        return () => {
            endSession(); // Cleanup on unmount
        };
    }, []);

    // Handle Audio Track Attachment
    useEffect(() => {
        if (!room) return;

        const handleTrackSubscribed = (track: Track) => {
            if (track.kind === Track.Kind.Audio) {
                const element = track.attach();
                document.body.appendChild(element);
            }
        };

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

        // Check existing tracks
        room.participants.forEach(p => {
            p.tracks.forEach(pub => {
                if (pub.track && pub.track.kind === Track.Kind.Audio) {
                    const element = pub.track.attach();
                    document.body.appendChild(element);
                }
            })
        });

        return () => {
            room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        };
    }, [room]);

    useEffect(() => {
        if (isSessionActive) {
            setStatus('Connected to ' + config.pageTitle);
        }
    }, [isSessionActive, config.pageTitle]);

    return (
        <group position={[0, 2.5, -3]}>
            <Text fontSize={0.15} color={isSessionActive ? "#00ff00" : "#ffff00"} anchorX="center" anchorY="middle">
                {status}
            </Text>
            {isSessionActive && onDisconnect && (
                <Interactive onSelect={onDisconnect}>
                    <group position={[0, -0.2, 0]}>
                        <mesh>
                            <planeGeometry args={[0.5, 0.2]} />
                            <meshBasicMaterial color="#ff0000" opacity={0.8} transparent />
                        </mesh>
                        <Text position={[0, 0, 0.01]} fontSize={0.1} color="white" anchorX="center" anchorY="middle">
                            Disconnect
                        </Text>
                    </group>
                </Interactive>
            )}
        </group>
    );
}
