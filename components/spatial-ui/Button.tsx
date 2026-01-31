import { Container, Text, DefaultProperties } from '@react-three/uikit';
import { useState } from 'react';
import { theme } from './theme';

interface ButtonProps extends DefaultProperties {
    label: string;
    onClick?: () => void;
    isActive?: boolean;
    icon?: React.ReactNode;
}

export function Button({ label, onClick, isActive, icon, ...props }: ButtonProps) {
    const [hovered, setHover] = useState(false);

    return (
        <Container
            onClick={onClick}
            onHoverIn={() => setHover(true)}
            onHoverOut={() => setHover(false)}
            backgroundColor={isActive ? theme.colors.primary : hovered ? theme.colors.glassHover : theme.colors.glass}
            borderRadius={8}
            padding={12}
            margin={4}
            cursor="pointer"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor={isActive ? theme.colors.primary : theme.colors.border}
            borderOpacity={isActive ? 1 : 0.2}
            {...props}
        >
            {icon && <Container marginRight={8}>{icon}</Container>}
            <Text
                color={isActive ? '#000000' : theme.colors.text}
                fontSize={16}
                fontWeight="bold"
            >
                {label}
            </Text>
        </Container>
    );
}
