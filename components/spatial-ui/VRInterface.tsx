import { Root, Text, Container, Image } from '@react-three/uikit';
import { Panel } from './Panel';
import { Button } from './Button';
import { theme } from './theme';
import { useState } from 'react';

// Icons using Lucide via uikit if possible, otherwise simple text fallback or standard lucide-react if integrated?
// Since we installed @react-three/uikit-lucide, let's try to use it if imports work, else fallback.
// For safety/speed, I'll stick to text/simple shapes unless icon package works out of box.
// Actually, let's just use text for now to ensure it works.

interface ServiceConfig {
    id: string;
    title: string;
    description: string;
    color: string;
}

const SERVICES: ServiceConfig[] = [
    { id: 'meditation', title: 'Meditation', description: 'Guided mindfulness sessions', color: '#ff00ff' },
    { id: 'music', title: 'Divine Music', description: 'Immersive sound journey', color: '#0000ff' }, // New Blue Color
    { id: 'astrology', title: 'Astrology', description: 'Cosmic insights & readings', color: '#00ffff' },
    { id: 'satsang', title: 'Satsang Hall', description: 'Spiritual discourse', color: '#ffff00' },
];

export function VRInterface({
    onConnect,
    onDisconnect,
    activeServiceId
}: {
    onConnect: (id: string) => void;
    onDisconnect: () => void;
    activeServiceId: string | null;
}) {

    return (
        <Root flexDirection="column" pixelSize={0.002} sizeX={2} sizeY={1.5} position={[0, 1.5, -2]} anchorX="center" anchorY="center">
            <Panel width="100%" height="100%" alignItems="center" justifyContent="flex-start">

                {/* Header */}
                <Container marginBottom={32} alignItems="center">
                    <Text fontSize={42} fontWeight="bold" color={theme.colors.primary}>RRAASI UNIVERSE</Text>
                    <Text fontSize={18} color={theme.colors.textSecondary}>Choose your spiritual path</Text>
                </Container>

                {/* Status Indicator */}
                {activeServiceId && (
                    <Container
                        marginBottom={24}
                        padding={12}
                        backgroundColor="#1a4d1a"
                        borderRadius={8}
                        borderColor="#00ff00"
                        borderWidth={1}
                    >
                        <Text color="#00ff00">Connected to {SERVICES.find(s => s.id === activeServiceId)?.title}</Text>
                        <Button label="Disconnect" onClick={onDisconnect} marginTop={8} backgroundColor="#4d1a1a" />
                    </Container>
                )}

                {/* Services Grid */}
                <Container flexDirection="row" gap={16} width="90%" justifyContent="center">
                    {SERVICES.map((service) => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            isActive={activeServiceId === service.id}
                            onConnect={() => onConnect(service.id)}
                        />
                    ))}
                </Container>

            </Panel>
        </Root>
    );
}

function ServiceCard({ service, isActive, onConnect }: { service: ServiceConfig, isActive: boolean, onConnect: () => void }) {
    return (
        <Container
            width={240}
            height={280}
            backgroundColor={theme.colors.glass}
            borderRadius={16}
            padding={16}
            borderColor={isActive ? theme.colors.primary : theme.colors.border}
            borderOpacity={isActive ? 1 : 0.2}
            borderWidth={isActive ? 2 : 1}
            flexDirection="column"
            alignItems="center"
            justifyContent="space-between"
        >
            <Container
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor={service.color}
                opacity={0.8}
                marginBottom={16}
            />
            <Container flexDirection="column" alignItems="center">
                <Text fontSize={24} fontWeight="bold" color="white">{service.title}</Text>
                <Text fontSize={14} color="#cccccc" textAlign="center" marginTop={8}>{service.description}</Text>
            </Container>

            <Button
                label={isActive ? "Active" : "Connect"}
                onClick={onConnect}
                isActive={isActive}
                width="100%"
                marginTop={16}
            />
        </Container>
    )
}
