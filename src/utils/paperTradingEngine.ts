import { PaperAccount, PaperPosition, TradeRecord, SupportedAsset, AIReasoning } from '../types';

export interface AutoTradeExecutionResult {
  updatedAccount: PaperAccount;
  closedTrades: TradeRecord[];
  events: Array<{
    type: 'ENTRY' | 'TP1' | 'TP2' | 'STOP_LOSS' | 'TRAILING_STOP' | 'SELL_SIGNAL';
    asset: SupportedAsset;
    price: number;
    pnlUsd?: number;
    pnlPercent?: number;
    messageAr: string;
    messageEn: string;
    timestamp: number;
  }>;
}

/**
 * Automatically evaluates and updates open paper trading positions
 * Handles:
 * 1. Mark-to-market live PnL calculation
 * 2. TP1 hit -> locks stop loss to entry price (Break-even) + arms 2% trailing stop
 * 3. TP2 hit -> full automated profit exit
 * 4. Stop Loss hit -> automated capital protection exit
 * 5. Trailing Stop hit -> automated profit lock exit
 * 6. Bot Sell Signal -> automated emergency exit
 */
export function evaluatePaperPositionsAuto(
  account: PaperAccount,
  livePrices: Record<SupportedAsset, number>,
  aiSignal: AIReasoning | null,
  currentAsset: SupportedAsset
): AutoTradeExecutionResult {
  if (account.positions.length === 0) {
    return {
      updatedAccount: account,
      closedTrades: [],
      events: [],
    };
  }

  let currentVirtualBalance = account.virtualBalanceUsd;
  let currentAllocatedCapital = account.allocatedCapitalUsd;
  let currentRealizedPnl = account.totalRealizedPnlUsd;

  const survivingPositions: PaperPosition[] = [];
  const newlyClosedTrades: TradeRecord[] = [];
  const events: AutoTradeExecutionResult['events'] = [];

  for (const pos of account.positions) {
    const livePrice = livePrices[pos.asset] || pos.currentPrice || pos.entryPrice;
    if (livePrice <= 0) {
      survivingPositions.push(pos);
      continue;
    }

    const curVal = pos.amount * livePrice;
    const pnlUsd = curVal - pos.allocatedUsd;
    const pnlPct = (pnlUsd / pos.allocatedUsd) * 100;
    const highestPrice = Math.max(pos.highestPrice || pos.entryPrice, livePrice);

    // Calculate dynamic 2% trailing stop price once profit is positive
    let trailingStopPrice = pos.trailingStopPrice;
    if (pos.partialSold || livePrice >= pos.tp1) {
      // 2% below highest peak
      const calculatedTrail = Math.round(highestPrice * 0.98);
      trailingStopPrice = Math.max(trailingStopPrice || pos.entryPrice, calculatedTrail);
    }

    let shouldClose = false;
    let closeReason = '';
    let closeReasonAr = '';
    let closeEventType: AutoTradeExecutionResult['events'][0]['type'] = 'TP2';

    // Condition 1: Bot AI issues SPOT_SELL_ALL or STRONG_SELL signal
    const isBotSellSignal = 
      aiSignal && 
      pos.asset === (aiSignal.asset || currentAsset) && 
      (aiSignal.spotAction === 'SPOT_SELL_ALL' || aiSignal.signalType === 'STRONG_SELL');

    if (isBotSellSignal) {
      shouldClose = true;
      closeReason = `🤖 Auto Exit: Bot issued SPOT_SELL_ALL signal at $${livePrice.toLocaleString()}`;
      closeReasonAr = `🤖 إغلاق آلي: صدور إشارة بيع وخروج كامل (SPOT_SELL_ALL) من البوت عند $${livePrice.toLocaleString()}`;
      closeEventType = 'SELL_SIGNAL';
    } 
    // Condition 2: Full Take Profit 2 Target Hit
    else if (pos.tp2 > 0 && livePrice >= pos.tp2) {
      shouldClose = true;
      closeReason = `🎯 Auto TP2 Hit: Target $${pos.tp2.toLocaleString()} reached! Locked +${pnlPct.toFixed(1)}% profit.`;
      closeReasonAr = `🎯 تحقيق الهدف الثاني TP2 تلقائياً عند $${pos.tp2.toLocaleString()} بنجاح (ربح +${pnlPct.toFixed(1)}%)`;
      closeEventType = 'TP2';
    }
    // Condition 3: Strict Stop Loss Hit (2x ATR Protection)
    else if (pos.stopLoss > 0 && livePrice <= pos.stopLoss) {
      shouldClose = true;
      closeReason = `🛑 Auto Stop-Loss: Protected capital at $${pos.stopLoss.toLocaleString()} (${pnlPct.toFixed(1)}%).`;
      closeReasonAr = `🛑 تفعيل وقف الخسارة الصارم آلياً عند $${pos.stopLoss.toLocaleString()} لحماية المحفظة (${pnlPct.toFixed(1)}%)`;
      closeEventType = 'STOP_LOSS';
    }
    // Condition 4: Trailing Stop Hit after peak retracement
    else if (trailingStopPrice && trailingStopPrice > pos.entryPrice && livePrice <= trailingStopPrice) {
      shouldClose = true;
      closeReason = `🔒 Auto Trailing Stop: Locked gains at $${trailingStopPrice.toLocaleString()} (+${pnlPct.toFixed(1)}%).`;
      closeReasonAr = `🔒 تفعيل الوقف المتحرك آلياً عند $${trailingStopPrice.toLocaleString()} وتأمين الأرباح (+${pnlPct.toFixed(1)}%)`;
      closeEventType = 'TRAILING_STOP';
    }

    if (shouldClose) {
      // Execute automated liquidation
      const finalReturnUsd = pos.amount * livePrice;
      const tradePnlUsd = Number(pnlUsd.toFixed(2));
      const tradePnlPct = Number(pnlPct.toFixed(2));

      currentVirtualBalance = Number((currentVirtualBalance + finalReturnUsd).toFixed(2));
      currentAllocatedCapital = Number(Math.max(0, currentAllocatedCapital - pos.allocatedUsd).toFixed(2));
      currentRealizedPnl = Number((currentRealizedPnl + tradePnlUsd).toFixed(2));

      const closedRecord: TradeRecord = {
        id: `trade_auto_${Date.now()}_${pos.asset}`,
        asset: pos.asset,
        timestamp: pos.entryTime,
        dateFormatted: new Date().toISOString().replace('T', ' ').substring(0, 16),
        hourOfDay: new Date().getUTCHours(),
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getUTCDay()],
        action: 'BUY',
        entryPrice: pos.entryPrice,
        exitPrice: livePrice,
        currentPrice: livePrice,
        amountBtc: pos.amount,
        capitalUsd: pos.allocatedUsd,
        pnlUsd: tradePnlUsd,
        pnlPercent: tradePnlPct,
        status: tradePnlUsd >= 0 ? 'CLOSED_WIN' : 'CLOSED_LOSS',
        durationHours: Math.max(1, Math.round((Date.now() - pos.entryTime) / (3600 * 1000))),
        signalConfidence: aiSignal?.convictionScore || 85,
        confluenceReason: closeReason,
        marketCondition: 'STRONG_TREND',
        partialExitTaken: pos.partialSold,
        learnedLessonAr: tradePnlUsd >= 0 
          ? `نجاح خطة التداول الآلية وجني الأرباح عند الهدف المحدد (${tradePnlPct}%)`
          : `تفعيل وقف الخسارة الصارم لمنع النزيف وتأمين رأس المال التجريبي`,
        learnedLessonEn: tradePnlUsd >= 0
          ? `Automated execution adhered to plan and locked profit (${tradePnlPct}%)`
          : `Strict stop-loss triggered as designed to prevent major drawdown`,
      };

      newlyClosedTrades.push(closedRecord);
      events.push({
        type: closeEventType,
        asset: pos.asset,
        price: livePrice,
        pnlUsd: tradePnlUsd,
        pnlPercent: tradePnlPct,
        messageAr: closeReasonAr,
        messageEn: closeReason,
        timestamp: Date.now(),
      });
    } else {
      // Position remains active -> update intermediate state (e.g. TP1 milestone)
      let partialSold = pos.partialSold;
      let effectiveStopLoss = pos.stopLoss;

      // Milestone: First Target TP1 reached -> Move Stop to Breakeven
      if (!partialSold && pos.tp1 > 0 && livePrice >= pos.tp1) {
        partialSold = true;
        effectiveStopLoss = Math.max(pos.stopLoss, pos.entryPrice); // Break-even stop!
        events.push({
          type: 'TP1',
          asset: pos.asset,
          price: livePrice,
          pnlUsd: Number(pnlUsd.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          messageAr: `🎯 تم الوصول للهدف الأول TP1 ($${pos.tp1.toLocaleString()}) لـ ${pos.asset} - تم رفع وقف الخسارة إلى سعر الدخول وتفعيل الوقف المتحرك!`,
          messageEn: `🎯 Target 1 (TP1 $${pos.tp1.toLocaleString()}) hit for ${pos.asset} - Stop moved to breakeven with 2% trailing stop active!`,
          timestamp: Date.now(),
        });
      }

      survivingPositions.push({
        ...pos,
        currentPrice: livePrice,
        unrealizedPnlUsd: Number(pnlUsd.toFixed(2)),
        unrealizedPnlPercent: Number(pnlPct.toFixed(2)),
        highestPrice,
        trailingStopPrice,
        partialSold,
        stopLoss: effectiveStopLoss,
      });
    }
  }

  return {
    updatedAccount: {
      ...account,
      virtualBalanceUsd: currentVirtualBalance,
      allocatedCapitalUsd: currentAllocatedCapital,
      totalRealizedPnlUsd: currentRealizedPnl,
      positions: survivingPositions,
      tradeHistory: [...newlyClosedTrades, ...account.tradeHistory],
    },
    closedTrades: newlyClosedTrades,
    events,
  };
}

/**
 * Automatically opens a new paper trade position when the bot generates a valid Buy Signal
 */
export function autoOpenPaperTradeOnSignal(
  account: PaperAccount,
  asset: SupportedAsset,
  livePrice: number,
  aiSignal: AIReasoning,
  allocationPercent: number = 25
): { updatedAccount: PaperAccount; opened: boolean; event?: AutoTradeExecutionResult['events'][0] } {
  // Guard checks
  if (!account.autoExecuteSignals) {
    return { updatedAccount: account, opened: false };
  }

  if (livePrice <= 0) {
    return { updatedAccount: account, opened: false };
  }

  // Check if position already open for this asset
  const existingPosition = account.positions.find((p) => p.asset === asset);
  if (existingPosition) {
    return { updatedAccount: account, opened: false };
  }

  // Check if signal is a buy action
  const isBuySignal = aiSignal.spotAction === 'SPOT_BUY' || aiSignal.signalType === 'STRONG_BUY' || aiSignal.signalType === 'BUY';
  if (!isBuySignal) {
    return { updatedAccount: account, opened: false };
  }

  // Check available cash (minimum $30 needed)
  if (account.virtualBalanceUsd < 30) {
    return { updatedAccount: account, opened: false };
  }

  const investUsd = Number(((account.virtualBalanceUsd * allocationPercent) / 100).toFixed(2));
  if (investUsd < 15) {
    return { updatedAccount: account, opened: false };
  }

  const amount = investUsd / livePrice;
  const tp1 = aiSignal.target1 || Math.round(livePrice * 1.035);
  const tp2 = aiSignal.target2 || Math.round(livePrice * 1.07);
  const stopLoss = aiSignal.stopLoss || Math.round(livePrice * 0.974);

  const newPosition: PaperPosition = {
    id: `pos_auto_${Date.now()}_${asset}`,
    asset,
    entryPrice: livePrice,
    currentPrice: livePrice,
    amount,
    allocatedUsd: investUsd,
    tp1,
    tp2,
    stopLoss,
    entryTime: Date.now(),
    unrealizedPnlUsd: 0,
    unrealizedPnlPercent: 0,
    partialSold: false,
    highestPrice: livePrice,
    trailingStopPrice: Math.round(livePrice * 0.98),
  };

  const updatedAccount: PaperAccount = {
    ...account,
    virtualBalanceUsd: Number((account.virtualBalanceUsd - investUsd).toFixed(2)),
    allocatedCapitalUsd: Number((account.allocatedCapitalUsd + investUsd).toFixed(2)),
    positions: [newPosition, ...account.positions],
  };

  const event: AutoTradeExecutionResult['events'][0] = {
    type: 'ENTRY',
    asset,
    price: livePrice,
    pnlUsd: 0,
    pnlPercent: 0,
    messageAr: `⚡ دخول تلقائي: فتح صفقة ${asset}/USDT بقيمة $${investUsd.toLocaleString()} بناءً على إشارة البوت الفورية (سعر الدخول: $${livePrice.toLocaleString()})`,
    messageEn: `⚡ Auto Entry: Executed ${asset}/USDT paper position for $${investUsd.toLocaleString()} from live bot signal (Entry: $${livePrice.toLocaleString()})`,
    timestamp: Date.now(),
  };

  return {
    updatedAccount,
    opened: true,
    event,
  };
}
