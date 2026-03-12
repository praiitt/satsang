/**
 * Buffer GraphQL API Integration
 *
 * Buffer's GraphQL API provides more stability and detailed error reporting.
 * Documentation: https://developers.buffer.com/reference.html
 */

const BUFFER_GRAPHQL_ENDPOINT = 'https://api.buffer.com';

export interface BufferChannel {
    id: string;
    name: string;
    service: string;
    avatarUrl?: string;
    username?: string;
}

export interface BufferPostInput {
    channelIds: string[];        // Buffer channel IDs to post to
    text: string;                // Post caption/text
    mediaUrls?: string[];        // Public image URLs to attach
    scheduledAt?: string;        // ISO 8601 datetime
}

export interface BufferPostResult {
    success: boolean;
    postIds?: string[];
    errors?: string[];
}

function getBufferToken(): string {
    const token = process.env.BUFFER_ACCESS_TOKEN;
    if (!token) {
        throw new Error('BUFFER_ACCESS_TOKEN environment variable is required.');
    }
    return token;
}

async function graphqlRequest(query: string, variables: any = {}) {
    const token = getBufferToken();
    const response = await fetch(BUFFER_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Buffer GraphQL error: ${response.status} ${JSON.stringify(result.errors || result)}`);
    }
    return result.data;
}

/**
 * Fetch connected Buffer channels (profiles) via GraphQL
 */
export async function getBufferChannels(): Promise<BufferChannel[]> {
    try {
        // 1. Get Organizations
        const orgData = await graphqlRequest(`
            query GetOrganizations {
                account {
                    organizations {
                        id
                    }
                }
            }
        `);

        const orgs = orgData?.account?.organizations || [];
        const allChannels: BufferChannel[] = [];

        // 2. For each Org, get Channels
        for (const org of orgs) {
            const channelData = await graphqlRequest(`
                query GetChannels($orgId: OrganizationId!) {
                    channels(input: { organizationId: $orgId }) {
                        id
                        name
                        service
                        avatar
                    }
                }
            `, { orgId: org.id });

            const channels = channelData?.channels || [];
            allChannels.push(...channels.map((c: any) => ({
                id: c.id,
                name: c.name,
                service: c.service,
                avatarUrl: c.avatar,
            })));
        }

        return allChannels;
    } catch (error: any) {
        console.error('[buffer] Failed to fetch channels:', error);
        throw error;
    }
}

/**
 * Create a post in Buffer using createPost mutation
 */
export async function publishToBuffer(input: BufferPostInput): Promise<BufferPostResult> {
    const results: string[] = [];
    const errors: string[] = [];

    const mutation = `
        mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
                ... on PostActionSuccess {
                    post {
                        id
                    }
                }
                ... on RestProxyError {
                    message
                }
                ... on UnexpectedError {
                    message
                }
                ... on NotFoundError {
                    message
                }
                ... on UnauthorizedError {
                    message
                }
                ... on LimitReachedError {
                    message
                }
                ... on InvalidInputError {
                    message
                }
            }
        }
    `;

    const channels = await getBufferChannels();

    for (const channelId of input.channelIds) {
        try {
            let dueAt = input.scheduledAt;
            if (dueAt && !dueAt.includes('Z')) {
                dueAt = new Date(dueAt).toISOString();
            }

            const variables: any = {
                input: {
                    channelId,
                    text: input.text,
                    dueAt: dueAt || undefined,
                    schedulingType: 'automatic',
                    mode: dueAt ? 'customScheduled' : 'addToQueue',
                }
            };

            const channel = channels.find(c => c.id === channelId);
            if (channel?.service === 'instagram') {
                variables.input.metadata = {
                    instagram: {
                        type: 'post',
                        shouldShareToFeed: true
                    }
                };
            }

            if (input.mediaUrls && input.mediaUrls.length > 0) {
                variables.input.assets = {
                    images: input.mediaUrls.map(url => ({ url }))
                };
            }

            console.log(`[buffer] Creating post for channel ${channelId} via GraphQL`);
            const data = await graphqlRequest(mutation, variables);
            console.log(`[buffer] GraphQL raw response:`, JSON.stringify(data, null, 2));
            
            const payload = data.createPost;

            if (payload.post?.id) {
                console.log(`[buffer] Post successfully created with ID: ${payload.post.id}`);
                results.push(payload.post.id);
            } else {
                console.error(`[buffer] GraphQL payload error:`, JSON.stringify(payload, null, 2));
                errors.push(`Channel ${channelId}: ${payload.message || 'Unknown error'}`);
            }
        } catch (err: any) {
            console.error(`[buffer] Mutation error for channel ${channelId}:`, err);
            errors.push(`Channel ${channelId}: ${err.message}`);
        }
    }

    return {
        success: errors.length === 0,
        postIds: results,
        errors: errors.length > 0 ? errors : undefined,
    };
}

export function isBufferConfigured(): boolean {
    return !!process.env.BUFFER_ACCESS_TOKEN;
}
