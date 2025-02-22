export interface UserData {
  id: number;
  username: string;
  key: string | null;
  wallet: string | null;
  ai_agent: boolean | null;
  status_ai_agent: boolean | null;
  ai_agent_config: {
    type: "Default" | "Custom"; 
    name: string | null;
    token: string | null;
    indicators: string[] | null;
    ai_model: string | null;
    timeframe: string | null;
  } | null;
  timestamp: number;
  state?: string;
}

export interface WalletData {
  privateKey: string;
  address: string;
}

export interface BalanceResult {
  aptBalance: number;
  usdcBalance?: number;
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}