// Service cost configuration
export const SERVICE_COSTS = {
    // Satsang: charged per minute
    SATSANG_PER_MINUTE: 2,

    // Music: charged per track
    MUSIC_TRACK: 50,

    // Minimum charge (1 minute minimum for Satsang)
    SATSANG_MINIMUM: 2,
} as const;

export type ServiceType = 'satsang' | 'music';

export function calculateSatsangCost(durationMinutes: number): number {
    // Round up to nearest minute
    const minutes = Math.ceil(durationMinutes);
    // Ensure minimum charge
    return Math.max(minutes * SERVICE_COSTS.SATSANG_PER_MINUTE, SERVICE_COSTS.SATSANG_MINIMUM);
}

export function getMusicCost(): number {
    return SERVICE_COSTS.MUSIC_TRACK;
}
