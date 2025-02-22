import { Candle, fetchMarketData } from './marketData';
import { SMA, RSI, MACD, BollingerBands, Stochastic, ATR, PSAR, IchimokuCloud } from 'technicalindicators';


async function main() {
    try {
      const indicators = await fetchMarketData('1d', 'BTC_USD');
      const last50Indicators = indicators.slice(-50);
      console.log('50 chỉ báo cuối cùng:', last50Indicators);
      const sma = calculateSMA(candles, 10);
    console.log('SMA (10):', sma.slice(-5));
    } catch (error) {
      console.error('Lỗi khi tính toán chỉ báo:', error);
    }
  }
  
  main();