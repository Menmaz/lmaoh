import axios from 'axios';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function isValidBinanceInterval(timeframe: string): boolean {
  const validIntervals = ['5m', '15m', '30m', '1h', '4h', '1d'];
  return validIntervals.includes(timeframe);
}

const convertTokenToBinanceSymbol = (token: string): string => {
    return token.replace("_USD", "USDT").toUpperCase();
  };

export const fetchMarketData = async (timeframe: string, token: string): Promise<Candle[]> => {
  if (!isValidBinanceInterval(timeframe)) {
    throw new Error(`Khung thời gian không hợp lệ: ${timeframe}. Phải là một trong: 5m, 15m, 30m, 1h, 4h, 1d`);
  }

  const symbol = convertTokenToBinanceSymbol(token);

  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol, interval: timeframe, limit: 400 },
    });

    const candles: Candle[] = response.data.map((kline: any[]) => ({
      openTime: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }));

    return candles;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Lỗi khi lấy dữ liệu thị trường cho ${symbol}:`, error.message);
    } else {
      console.error(`Lỗi khi lấy dữ liệu thị trường cho ${symbol}:`, error);
    }
    throw error;
  }
};