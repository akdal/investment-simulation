import type { Investor, Round, Shareholding } from '../../types';
import { fmtMoney, fmtPercent, fmt } from '../../lib/format';

interface MobileInvestorListProps {
  investors: Investor[];
  rounds: Round[];
  capTable: Shareholding[];
}

export function MobileInvestorList({
  investors,
  rounds,
  capTable,
}: MobileInvestorListProps) {
  // 총 주식수 계산
  const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);

  // 마지막 라운드의 포스트머니 가치
  const lastRound = rounds[rounds.length - 1];
  const postMoneyValuation = lastRound?.postMoneyValuation || 0;

  // 투자자별 요약 계산
  const getInvestorSummary = (investorId: string) => {
    let primaryInvestment = 0;
    let secondaryBuy = 0;
    let secondarySell = 0;

    rounds.forEach(round => {
      round.investments
        .filter(inv => inv.investorId === investorId && !inv.isSecondary)
        .forEach(inv => { primaryInvestment += inv.amount; });

      round.investments
        .filter(inv => inv.investorId === investorId && inv.isSecondary)
        .forEach(inv => { secondaryBuy += inv.amount; });

      round.investments
        .filter(inv => inv.sellerId === investorId && inv.isSecondary)
        .forEach(inv => { secondarySell += inv.amount; });
    });

    return { primaryInvestment, secondaryBuy, secondarySell };
  };

  // 지분이 있는 투자자만 필터링하고 지분율 기준 정렬
  const holdingsWithInvestor = capTable
    .map(h => {
      const investor = investors.find(i => i.id === h.investorId);
      const percentage = totalShares > 0 ? (h.shares / totalShares) * 100 : 0;
      const value = postMoneyValuation > 0 && totalShares > 0
        ? (h.shares / totalShares) * postMoneyValuation
        : 0;
      const summary = getInvestorSummary(h.investorId);
      return {
        ...h,
        investor,
        percentage,
        value,
        ...summary,
      };
    })
    .filter(h => h.shares > 0)
    .sort((a, b) => b.percentage - a.percentage);

  if (holdingsWithInvestor.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        아직 투자자가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {holdingsWithInvestor.map((h, idx) => (
        <div
          key={h.investorId}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* 투자자 헤더 */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center flex-shrink-0 font-medium">
                {idx + 1}
              </span>
              <h3 className="font-bold text-slate-900">
                {h.investor?.name || '알 수 없음'}
              </h3>
              {h.investor?.type && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  h.investor.type === 'FOUNDER'
                    ? 'bg-blue-100 text-blue-600'
                    : h.investor.type === 'EMPLOYEE'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  {h.investor.type === 'FOUNDER' ? '창업자' :
                   h.investor.type === 'EMPLOYEE' ? '임직원' : '투자자'}
                </span>
              )}
            </div>
          </div>

          {/* 투자자 상세 */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">현재 지분</span>
              <span className="font-bold text-lg">{fmtPercent(h.percentage)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">보유 주식</span>
              <span className="font-medium">{fmt(h.shares)}주</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">평가액</span>
              <span className="font-semibold text-blue-600">{fmtMoney(Math.round(h.value))}</span>
            </div>

            {/* 활동 요약 */}
            {(h.primaryInvestment > 0 || h.secondaryBuy > 0 || h.secondarySell > 0) && (
              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                {h.primaryInvestment > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-600">총 투자금</span>
                    <span className="text-emerald-600 font-medium">{fmtMoney(h.primaryInvestment)}</span>
                  </div>
                )}
                {h.secondaryBuy > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-600">구주 매수</span>
                    <span className="text-amber-600 font-medium">{fmtMoney(h.secondaryBuy)}</span>
                  </div>
                )}
                {h.secondarySell > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-violet-600">구주 매도</span>
                    <span className="text-violet-600 font-medium">{fmtMoney(h.secondarySell)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
