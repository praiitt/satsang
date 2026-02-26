
export interface IntegrationToken {
    userId: string;
    provider: 'youtube' | 'soundcloud';
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number; // Timestamp in milliseconds
    scope?: string;
    createdAt: number;
    updatedAt: number;
    valid: boolean;
    userEmail?: string;
    displayName?: string;
}

export const INTEGRATION_TOKENS_COLLECTION = 'user_integration_tokens';
