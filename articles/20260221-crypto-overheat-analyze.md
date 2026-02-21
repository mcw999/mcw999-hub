---
title: "暗号通貨取引の過熱冷却を検出するバックエンドアプリケーションの設計と実装"
emoji: "📈"
type: "tech"
topics: ["Node.js", "Express", "TypeScript", "Vitest"]
published: true
---

## はじめに

暗号通貨取引において、市場の過熱・冷却状態を正確に把握することは極めて重要です。特にKuCoin Futuresのような先物取引では、価格だけでなく出来高や建玉（Open Interest）の動きを総合的に分析する必要があります。

今回は、これらの課題を解決するために開発した「暗号通貨過熱冷却検出アプリケーション」について、技術選定の理由から実装のポイントまで詳しく解説します。

## アーキテクチャ概要

このアプリケーションは以下の3つのコアデータを分析します：

1. **価格データ（Price）**: 価格の変動とトレンド分析
2. **出来高データ（Volume）**: 取引活動の活発さ
3. **建玉データ（Open Interest）**: ポジションの偏りと市場参加者の動向

これらを組み合わせて、4つの異なるシグナルタイプを検出し、冷却レベルを4段階で分類します。

## 技術スタック選定の理由

### Node.js + Express

```typescript
import express from 'express';
import cors from 'cors';
import { marketAnalysisRouter } from './routes/analysis';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/analysis', marketAnalysisRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Node.jsを選択した主な理由：

- **リアルタイム処理**: 暗号通貨データのリアルタイム分析に適している
- **豊富なエコシステム**: 金融データ処理に必要なライブラリが充実
- **スケーラビリティ**: イベント駆動アーキテクチャによる高い同時処理能力

### TypeScript

型安全性が重要な金融データの処理において、TypeScriptの恩恵は計り知れません：

```typescript
interface MarketData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  openInterest: number;
}

interface CoolingSignal {
  type: 'high_zone' | 'price_weak' | 'volume_weak' | 'oi_signal';
  level: 'confirmed' | 'watch' | 'mild' | 'none';
  confidence: number;
  metadata: Record<string, any>;
}
```

### Vitest

テスト環境にVitestを選択した理由：

- **高速実行**: Viteベースによる爆速テスト実行
- **TypeScript対応**: 設定なしでTypeScriptをサポート
- **モダンなAPI**: Jest互換でありながらESMネイティブ

## 核心機能の実装

### 1. マルチシグナル検出エンジン

```typescript
class SignalDetector {
  private readonly timeframes: TimeframeConfig;
  
  constructor(timeframes: TimeframeConfig) {
    this.timeframes = timeframes;
  }

  async detectSignals(data: MarketData[]): Promise<CoolingSignal[]> {
    const signals: CoolingSignal[] = [];
    
    // High Zone Detection
    const highZoneSignal = await this.detectHighZone(data);
    if (highZoneSignal) signals.push(highZoneSignal);
    
    // Price Weakness Detection
    const priceWeakSignal = await this.detectPriceWeakness(data);
    if (priceWeakSignal) signals.push(priceWeakSignal);
    
    // Volume Analysis
    const volumeSignal = await this.analyzeVolume(data);
    if (volumeSignal) signals.push(volumeSignal);
    
    // Open Interest Signal
    const oiSignal = await this.analyzeOpenInterest(data);
    if (oiSignal) signals.push(oiSignal);
    
    return signals;
  }

  private async detectHighZone(data: MarketData[]): Promise<CoolingSignal | null> {
    const recentData = data.slice(-50); // 直近50期間
    const currentPrice = recentData[recentData.length - 1].price;
    const high = Math.max(...recentData.map(d => d.price));
    const low = Math.min(...recentData.map(d => d.price));
    
    const position = (currentPrice - low) / (high - low);
    
    if (position > 0.8) {
      return {
        type: 'high_zone',
        level: position > 0.95 ? 'confirmed' : position > 0.9 ? 'watch' : 'mild',
        confidence: position,
        metadata: { position, high, low, currentPrice }
      };
    }
    
    return null;
  }
}
```

### 2. タイムフレーム対応システム

異なる時間軸での分析を可能にするため、設定可能なタイムフレームシステムを実装：

```typescript
interface TimeframeConfig {
  htf: '4h' | '1d';  // Higher Time Frame
  ltf: '15m' | '1h'; // Lower Time Frame
}

class TimeframeAnalyzer {
  private config: TimeframeConfig;
  
  constructor(config: TimeframeConfig) {
    this.config = config;
  }
  
  async analyzeMultiTimeframe(symbol: string): Promise<{
    htf: CoolingSignal[];
    ltf: CoolingSignal[];
    combined: CoolingLevel;
  }> {
    const htfData = await this.fetchMarketData(symbol, this.config.htf);
    const ltfData = await this.fetchMarketData(symbol, this.config.ltf);
    
    const detector = new SignalDetector(this.config);
    
    const htfSignals = await detector.detectSignals(htfData);
    const ltfSignals = await detector.detectSignals(ltfData);
    
    // 複数時間軸の結果を統合
    const combinedLevel = this.combineCoolingLevels(htfSignals, ltfSignals);
    
    return {
      htf: htfSignals,
      ltf: ltfSignals,
      combined: combinedLevel
    };
  }
}
```

### 3. 冷却レベル分類システム

```typescript
type CoolingLevel = 'confirmed' | 'watch' | 'mild' | 'none';

class CoolingLevelClassifier {
  classify(signals: CoolingSignal[]): CoolingLevel {
    if (!signals.length) return 'none';
    
    const confirmedSignals = signals.filter(s => s.level === 'confirmed');
    const watchSignals = signals.filter(s => s.level === 'watch');
    const mildSignals = signals.filter(s => s.level === 'mild');
    
    // 複数の確認済みシグナルがある場合
    if (confirmedSignals.length >= 2) return 'confirmed';
    
    // 1つの確認済み + その他のシグナル
    if (confirmedSignals.length >= 1 && (watchSignals.length + mildSignals.length) >= 1) {
      return 'confirmed';
    }
    
    // Watchレベルの判定
    if (confirmedSignals.length === 1 || watchSignals.length >= 2) {
      return 'watch';
    }
    
    // Mildレベルの判定
    if (watchSignals.length >= 1 || mildSignals.length >= 2) {
      return 'mild';
    }
    
    return 'none';
  }
}
```

## テスト戦略

Vitestを活用した包括的なテスト戦略を実装：

```typescript
// tests/signal-detector.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalDetector } from '../src/services/signal-detector';
import { mockMarketData } from './fixtures/market-data';

describe('SignalDetector', () => {
  let detector: SignalDetector;
  
  beforeEach(() => {
    detector = new SignalDetector({
      htf: '4h',
      ltf: '15m'
    });
  });
  
  it('should detect high zone signal when price is near resistance', async () => {
    const testData = mockMarketData.highZoneScenario;
    const signals = await detector.detectSignals(testData);
    
    const highZoneSignal = signals.find(s => s.type === 'high_zone');
    expect(highZoneSignal).toBeDefined();
    expect(highZoneSignal?.level).toBe('confirmed');
  });
  
  it('should classify cooling level correctly', async () => {
    const classifier = new CoolingLevelClassifier();
    const testSignals = [
      { type: 'high_zone', level: 'confirmed', confidence: 0.95 },
      { type: 'volume_weak', level: 'watch', confidence: 0.75 }
    ];
    
    const level = classifier.classify(testSignals);
    expect(level).toBe('confirmed');
  });
});
```

## パフォーマンス最適化

大量のマーケットデータを効率的に処理するための最適化：

```typescript
class DataProcessor {
  private cache = new Map<string, MarketData[]>();
  private readonly CACHE_TTL = 60000; // 1分
  
  async processWithCaching(symbol: string, timeframe: string): Promise<CoolingSignal[]> {
    const cacheKey = `${symbol}_${timeframe}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return this.analyzeFromCache(cached);
    }
    
    const freshData = await this.fetchMarketData(symbol, timeframe);
    this.cache.set(cacheKey, freshData);
    
    return this.analyzeData(freshData);
  }
  
  private isCacheValid(data: MarketData[]): boolean {
    const lastTimestamp = data[data.length - 1]?.timestamp || 0;
    return Date.now() - lastTimestamp < this.CACHE_TTL;
  }
}
```

## 運用面での工夫

### エラーハンドリング

```typescript
class RobustSignalDetector extends SignalDetector {
  async detectSignals(data: MarketData[]): Promise<CoolingSignal[]> {
    try {
      if (!this.validateData(data)) {
        throw new Error('Invalid market data provided');
      }
      
      return await super.detectSignals(data);
    } catch (error) {
      console.error('Signal detection failed:', error);
      return []; // フェイルセーフとして空配列を返す
    }
  }
  
  private validateData(data: MarketData[]): boolean {
    return data.length > 0 && data.every(d => 
      typeof d.price === 'number' && 
      typeof d.volume === 'number' && 
      typeof d.openInterest === 'number'
    );
  }
}
```

## まとめ

このアプリケーションの開発を通じて、以下の技術的知見を得ることができました：

1. **型安全性の重要性**: 金融データ処理においてTypeScriptの型システムが如何に重要かを実感
2. **テスト駆動開発**: Vitestによる高速テスト実行がイテレーション速度を大幅に向上
3. **マルチタイムフレーム分析**: 異なる時間軸での分析結果を統合する複雑さとその価値

暗号通貨取引の分析ツールとして、実用的で拡張可能なアーキテクチャを構築することができました。今後は機械学習モデルの導入やより詳細な統計分析の追加を検討しています。

このような金融データ処理システムを構築する際の参考になれば幸いです。