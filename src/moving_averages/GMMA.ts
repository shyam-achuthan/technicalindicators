export class GMMA {
    private traderEMAs: number[];
    private investorEMAs: number[];
    private previousData: number[];
    private resultLength: number;

    constructor() {
        // Initialize EMAs for both groups
        this.traderEMAs = [3, 5, 8, 10, 12, 15];
        this.investorEMAs = [30, 35, 40, 45, 50, 60];
        this.previousData = [];
        this.resultLength = 0;
    }

    static calculate(data: number[]): { trader: number[][], investor: number[][] } {
        const gmma = new GMMA();
        return gmma.calculate(data);
    }

    private calculateEMA(period: number, price: number, previousEMA: number | null): number {
        const multiplier = 2 / (period + 1);
        
        if (previousEMA === null) {
            return price; // First value is just the price
        }
        
        return (price - previousEMA) * multiplier + previousEMA;
    }

    private calculateGroupEMAs(data: number[], periods: number[]): number[][] {
        const results: number[][] = periods.map(() => []);
        const emaValues: number[] = periods.map(() => 0);
        
        // Calculate EMAs for each period
        data.forEach((price, index) => {
            periods.forEach((period, periodIndex) => {
                if (index < period - 1) {
                    // Not enough data yet
                    results[periodIndex].push(0);
                } else if (index === period - 1) {
                    // Initial EMA is SMA
                    const sma = data.slice(0, period).reduce((a, b) => a + b) / period;
                    emaValues[periodIndex] = sma;
                    results[periodIndex].push(sma);
                } else {
                    // Calculate EMA
                    emaValues[periodIndex] = this.calculateEMA(
                        period, 
                        price, 
                        emaValues[periodIndex]
                    );
                    results[periodIndex].push(emaValues[periodIndex]);
                }
            });
        });

        return results;
    }

    calculate(data: number[]): { trader: number[][], investor: number[][] } {
        if (!data || data.length < 3) {
            throw new Error("Data array must contain at least 3 elements");
        }

        // Calculate EMAs for both groups
        const traderResults = this.calculateGroupEMAs(data, this.traderEMAs);
        const investorResults = this.calculateGroupEMAs(data, this.investorEMAs);

        return {
            trader: traderResults,
            investor: investorResults
        };
    }

    // Helper method to identify potential signals
    static identifySignals(data: { trader: number[][], investor: number[][] }): {
        compression: boolean[],
        expansion: boolean[],
        bullish: boolean[],
        bearish: boolean[]
    } {
        const length = data.trader[0].length;
        const signals = {
            compression: new Array(length).fill(false),
            expansion: new Array(length).fill(false),
            bullish: new Array(length).fill(false),
            bearish: new Array(length).fill(false)
        };

        for (let i = 1; i < length; i++) {
            // Calculate average spread for both groups
            const traderSpread = Math.max(...data.trader.map(ema => ema[i])) - 
                               Math.min(...data.trader.map(ema => ema[i]));
            const investorSpread = Math.max(...data.investor.map(ema => ema[i])) - 
                                 Math.min(...data.investor.map(ema => ema[i]));

            // Previous spreads
            const prevTraderSpread = Math.max(...data.trader.map(ema => ema[i-1])) - 
                                   Math.min(...data.trader.map(ema => ema[i-1]));
            const prevInvestorSpread = Math.max(...data.investor.map(ema => ema[i-1])) - 
                                     Math.min(...data.investor.map(ema => ema[i-1]));

            // Identify compression/expansion
            signals.compression[i] = traderSpread < prevTraderSpread && 
                                   investorSpread < prevInvestorSpread;
            signals.expansion[i] = traderSpread > prevTraderSpread && 
                                 investorSpread > prevInvestorSpread;

            // Check if all trader EMAs are above/below all investor EMAs
            const allTraderValues = data.trader.map(ema => ema[i]);
            const allInvestorValues = data.investor.map(ema => ema[i]);
            const minTrader = Math.min(...allTraderValues);
            const maxTrader = Math.max(...allTraderValues);
            const minInvestor = Math.min(...allInvestorValues);
            const maxInvestor = Math.max(...allInvestorValues);

            signals.bullish[i] = minTrader > maxInvestor;
            signals.bearish[i] = maxTrader < minInvestor;
        }

        return signals;
    }

    // Identify trend changes: 1 for bullish, -1 for bearish, 0 for no change
    static identifyTrendChange(data: { trader: number[][], investor: number[][] }): number[] {
        const length = data.trader[0].length;
        const trendChanges = new Array(length).fill(0);

        for (let i = 1; i < length; i++) {
            const prevTraderAvg = data.trader.reduce((sum, ema) => sum + ema[i-1], 0) / data.trader.length;
            const prevInvestorAvg = data.investor.reduce((sum, ema) => sum + ema[i-1], 0) / data.investor.length;
            const currentTraderAvg = data.trader.reduce((sum, ema) => sum + ema[i], 0) / data.trader.length;
            const currentInvestorAvg = data.investor.reduce((sum, ema) => sum + ema[i], 0) / data.investor.length;

            // Check for trend changes
            if (currentTraderAvg > currentInvestorAvg && prevTraderAvg <= prevInvestorAvg) {
                trendChanges[i] = 1;  // Turning bullish
            } else if (currentTraderAvg < currentInvestorAvg && prevTraderAvg >= prevInvestorAvg) {
                trendChanges[i] = -1; // Turning bearish
            }
        }

        return trendChanges;
    }
}

// Example usage:
// const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
// const results = GMMA.calculate(data);
// const signals = GMMA.identifySignals(results);
