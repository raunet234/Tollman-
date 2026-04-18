export interface RunEvent {
  runId: string;
  step: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'info';
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

export interface WalletInfo {
  publicKey: string;
  xlmBalance: string;
  usdcBalance: string;
  explorerUrl: string;
  friendbotUrl: string;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}
