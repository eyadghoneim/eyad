/**
 * ══════════════════════════════════════════════════════════════
 * 🏛️ EYAD Quantitative Trading Engine — Canonical Strategy Constants
 * ══════════════════════════════════════════════════════════════
 * 
 * Single Source of Truth for both Backend Daemon and Frontend Client.
 * All quantitative gates, conviction thresholds, and ATR multipliers
 * MUST be imported from this file to ensure 100% mathematical parity.
 * 
 * Version: 2.6.0 (Unified Parity)
 * ══════════════════════════════════════════════════════════════
 */

export const STRATEGY_THRESHOLDS = {
  // Entry Quality Gate
  ENTRY_QUALITY_MIN_SCORE: 70,       // Unified Gate: score >= 70 allows SPOT_BUY
  STRONG_BUY_MIN_SCORE: 82,          // Unified Conviction: score >= 82 triggers STRONG_BUY / Ideal stage
  BUY_MIN_SCORE: 70,                 // Score >= 70 triggers BUY / Good stage
  WAIT_MIN_SCORE: 45,                // Score between 45 and 69 is WAIT
  SKIP_MAX_SCORE: 44,                // Score < 45 is SKIP / NO_TRADE
  
  // Defensive / Exit Gates
  DEFENSIVE_SELL_SCORE: 32,          // Score <= 32 triggers SELL / SPOT_SELL_ALL
  STRONG_SELL_SCORE: 20,             // Score <= 20 triggers STRONG_SELL

  // Volatility & Regime Filters
  ADX_CHOP_THRESHOLD: 18,            // ADX < 18 triggers HARD REGIME CHOP GATE
  ADX_TREND_THRESHOLD: 25,           // ADX >= 25 is STRONG_TREND
  RVOL_MIN_THRESHOLD: 0.60,          // RVOL < 0.60 triggers RVOL FAKEOUT GATE
} as const;

export const STRATEGY_RISK_MULTIPLIERS = {
  // ATR Multipliers (Canonical Engine Standard)
  STOP_LOSS_ATR: 2.0,                // Stop Loss = Entry - (2.0 × ATR)
  TARGET_1_ATR: 2.5,                 // Take Profit 1 = Entry + (2.5 × ATR) -> R:R 1.25
  TARGET_2_ATR: 4.0,                 // Take Profit 2 = Entry + (4.0 × ATR) -> R:R 2.00
  TARGET_3_ATR: 5.5,                 // Take Profit 3 = Entry + (5.5 × ATR) -> R:R 2.75

  // Execution & Risk Controls
  MAX_PRICE_DROP_STOP_LOSS_PCT: 0.08,// Max hard stop loss cap: 8% (price * 0.92)
  TRAILING_STOP_PERCENT: 2.0,        // 2% trailing stop once TP1 is achieved
  PARTIAL_EXIT_TP1_PERCENT: 50,      // 50% partial exit when TP1 is touched
  MAX_PORTFOLIO_RISK_PER_TRADE: 2.0, // 2% maximum equity risk per position
  MAX_DRAWDOWN_LIMIT_PERCENT: 5.0,   // 5% max daily drawdown protection cooldown
} as const;

export const STRATEGY_ENGINE_SIGNATURE = {
  version: '3.0.0',
  id: 'EYAD-DETERMINISTIC-MTF-REGIME-V3',
  checksumInvariant: `${STRATEGY_THRESHOLDS.ENTRY_QUALITY_MIN_SCORE}:${STRATEGY_THRESHOLDS.STRONG_BUY_MIN_SCORE}:${STRATEGY_RISK_MULTIPLIERS.TARGET_1_ATR}:${STRATEGY_RISK_MULTIPLIERS.TARGET_2_ATR}`,
} as const;
