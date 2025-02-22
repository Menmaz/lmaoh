import { fetchMarketData, Candle } from './marketData';
import { maSettings, rsiSettings, macdSettings, bollingerSettings, stochasticSettings, atrSettings } from './settings';
import {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateParabolicSAR,
  calculateIchimokuCloud,
  calculateFibonacciRetracement,
  calculateVolumeProfile,
} from './indicatorUtils';

async function calculateIndicators(timeframe: string, token: string): Promise<{ [key: string]: any }[]> {
  const candles = await fetchMarketData(timeframe, token);
  const indicators: { [key: string]: any }[] = [];

  // Moving Average (MA)
  const maData: { [key: string]: number[] } = {};
  maSettings[timeframe].forEach(period => {
    maData[`ma${period}`] = calculateSMA(candles, period).slice(-5);
  });
  indicators.push({ "Moving Average (MA)": maData });

  // Relative Strength Index (RSI)
  const rsiPeriod = rsiSettings[timeframe];
  indicators.push({ 
    "Relative Strength Index (RSI)": { 
      [`rsi${rsiPeriod}`]: calculateRSI(candles, rsiPeriod).slice(-5) 
    }
  });

  // MACD
  const [fastPeriod, slowPeriod, signalPeriod] = macdSettings[timeframe];
  const macdResult = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);
  indicators.push({
    "MACD": {
      [`macd_${fastPeriod}_${slowPeriod}_${signalPeriod}`]: {
        macd: macdResult.macd.slice(-5),
        signal: macdResult.signal.slice(-5),
        histogram: macdResult.histogram.slice(-5),
      }
    }
  });

  // Bollinger Bands
  const [bollingerPeriod, stdDevFactor] = bollingerSettings[timeframe];
  const bbResult = calculateBollingerBands(candles, bollingerPeriod, stdDevFactor);
  indicators.push({
    "Bollinger Bands": {
      [`bollinger_${bollingerPeriod}_${stdDevFactor}`]: {
        middle: bbResult.middle.slice(-5),
        upper: bbResult.upper.slice(-5),
        lower: bbResult.lower.slice(-5),
      }
    }
  });

  // Stochastic Oscillator
  const [kPeriod, dPeriod] = stochasticSettings[timeframe];
  const stochasticResult = calculateStochastic(candles, kPeriod, dPeriod);
  indicators.push({
    "Stochastic Oscillator": {
      [`stochastic_${kPeriod}_${dPeriod}`]: {
        k: stochasticResult.k.slice(-5),
        d: stochasticResult.d.slice(-5),
      }
    }
  });

  // ATR
  const atrPeriod = atrSettings[timeframe];
  indicators.push({
    "ATR": { 
      [`atr${atrPeriod}`]: calculateATR(candles, atrPeriod).slice(-5) 
    }
  });

  // Parabolic SAR
  indicators.push({
    "Parabolic SAR": { 
      sar: calculateParabolicSAR(candles).slice(-5) 
    }
  });

  // Ichimoku Cloud
  const ichimokuResult = calculateIchimokuCloud(candles, 9, 26, 52);
  indicators.push({
    "Ichimoku Cloud": {
      [`ichimoku_${9}_${26}_${52}`]: {
        tenkanSen: ichimokuResult.tenkanSen.slice(-5),
        kijunSen: ichimokuResult.kijunSen.slice(-5),
        senkouSpanA: ichimokuResult.senkouSpanA.slice(-5),
        senkouSpanB: ichimokuResult.senkouSpanB.slice(-5),
        chikouSpan: ichimokuResult.chikouSpan.slice(-5),
      }
    }
  });

  // Volume Profile
  const vpResult = calculateVolumeProfile(candles);
  indicators.push({
    "Volume Profile": {
      volumeProfile: {
        priceLevels: vpResult.priceLevels.slice(-5),
        volumes: vpResult.volumes.slice(-5),
      }
    }
  });

  // Fibonacci Retracement (thêm mặc định vì chưa có trong code gốc)
  indicators.push({
    "Fibonacci Retracement": calculateFibonacciRetracement(candles)
  });

  return indicators;
}

export { calculateIndicators };