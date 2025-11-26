export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // for LiveKit Cloud Sandbox
  sandboxId?: string;
  agentName?: string;
  tokenEndpoint?: string; // Custom token endpoint for this agent
  // experimental: enable HeyGen avatar video sidecar
  enableHeygenAvatar?: boolean;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'सत्संग',
  pageTitle: 'सत्संग – आध्यात्मिक संवाद',
  pageDescription: 'हिन्दी में अपने गुरु के साथ आध्यात्मिक संवाद',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#ff7a00',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#ff9f4d',
  startButtonText: 'गुरुजी से बातचीत करें',

  // for LiveKit Cloud Sandbox
  sandboxId: undefined,
  agentName: process.env.NEXT_PUBLIC_AGENT_NAME || 'guruji',
  enableHeygenAvatar: process.env.NEXT_PUBLIC_ENABLE_HEYGEN_AVATAR === 'true',
};
