export interface Playlist {
    id: string;
    userId: string;
    name: string;
    description?: string;
    coverImage?: string;
    trackIds: string[];
    trackCount: number;
    createdAt: any;
    updatedAt: any;
}
