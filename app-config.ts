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
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Satsang',
  pageTitle: 'Satsang – Spiritual Voice Satsang',
  pageDescription: 'Hindi spiritual conversation with your guru',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#ff7a00',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#ff9f4d',
  startButtonText: 'सत्संग शुरू करें',

  // for LiveKit Cloud Sandbox
  sandboxId: undefined,
  agentName: process.env.NEXT_PUBLIC_AGENT_NAME || 'satsang-agent',
};
