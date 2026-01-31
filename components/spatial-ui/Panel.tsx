import { Container, DefaultProperties } from '@react-three/uikit';
import { ReactNode } from 'react';
import { theme } from './theme';

export function Panel({ children, ...props }: { children?: ReactNode } & DefaultProperties) {
    return (
        <Container
            backgroundColor={theme.colors.glass}
            borderRadius={theme.borderRadius}
            padding={theme.padding}
            borderColor={theme.colors.border}
            borderOpacity={0.1}
            borderWidth={2}
            flexDirection="column"
            {...props}
        >
            {children}
        </Container>
    );
}
