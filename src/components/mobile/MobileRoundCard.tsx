import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Round, Investor, Shareholding } from '../../types';
import { fmtMoney, fmtPercent, fmt } from '../../lib/format';

interface MobileRoundCardProps {
  round: Round;
  investors: Investor[];
  capTable: Shareholding[];
  prevRound?: Round;
}

export function MobileRoundCard({
  round,
  investors,
  capTable,
  prevRound,
}: MobileRoundCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const roundDate = round.date ? new Date(round.date) : null;
  const dateStr = roundDate
    ? `${roundDate.getFullYear()}년 ${roundDate.getMonth() + 1}월`
    : null;

  // 직전 라운드 대비 배수 계산
  const prevPostMoney = prevRound?.postMoneyValuation || 0;
  const multiple = prevPostMoney > 0 && round.preMoneyValuation > 0
    ? round.preMoneyValuation / prevPostMoney
    : null;

  const formatMultiple = (m: number) => {
    const rounded = Math.round(m * 10) / 10;
    return rounded % 1 === 0 ? `${rounded}x` : `${rounded.toFixed(1)}x`;
  };

  // 총 주식수 계산
  const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);

  // 지분이 있는 투자자만 필터링하고 지분율 기준 정렬
  const holdingsWithInvestor = capTable
    .map(h => {
      const investor = investors.find(i => i.id === h.investorId);
      const percentage = totalShares > 0 ? (h.shares / totalShares) * 100 : 0;
      const value = round.postMoneyValuation > 0 && totalShares > 0
        ? (h.shares / totalShares) * round.postMoneyValuation
        : 0;
      return {
        ...h,
        investor,
        percentage,
        value,
      };
    })
    .filter(h => h.shares > 0)
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* 라운드 헤더 */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">{round.name}</h3>
            {dateStr && (
              <p className="text-xs text-slate-500 mt-0.5">{dateStr}</p>
            )}
          </div>
          {multiple !== null && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              Math.round(multiple * 10) / 10 === 1
                ? 'bg-slate-100 text-slate-500'
                : multiple < 1
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'
            }`}>
              {formatMultiple(multiple)}
            </span>
          )}
        </div>
      </div>

      {/* 라운드 요약 */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">프리머니</span>
          <span className="font-semibold">{fmtMoney(round.preMoneyValuation)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-emerald-600">투자금</span>
          <span className="font-semibold text-emerald-600">{fmtMoney(round.investmentAmount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">포스트머니</span>
          <span className="font-bold">{fmtMoney(round.postMoneyValuation)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>주당 가격</span>
          <span>{fmt(round.sharePrice)}원</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>총 발행주식</span>
          <span>{fmt(totalShares)}주</span>
        </div>
      </div>

      {/* 투자자 상세 토글 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 border-t border-slate-100 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <span className="font-medium">
          투자자 상세 ({holdingsWithInvestor.length}명)
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* 투자자 목록 (펼쳤을 때) */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-2 bg-slate-50/50">
          {holdingsWithInvestor.map((h, idx) => (
            <div
              key={h.investorId}
              className={`flex items-center justify-between py-2 ${
                idx > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {h.investor?.name || '알 수 없음'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{fmtPercent(h.percentage)}</div>
                <div className="text-xs text-slate-500">{fmtMoney(Math.round(h.value))}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
