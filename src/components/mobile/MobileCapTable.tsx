import { useState } from 'react';
import type { Round, Investor, Shareholding } from '../../types';
import { MobileRoundCard } from './MobileRoundCard';
import { MobileInvestorList } from './MobileInvestorList';
import { fmtMoney } from '../../lib/format';

type TabType = 'rounds' | 'investors';

interface MobileCapTableProps {
  rounds: Round[];
  investors: Investor[];
  getCapTableAtRound: (roundIndex: number) => Shareholding[];
}

export function MobileCapTable({
  rounds,
  investors,
  getCapTableAtRound,
}: MobileCapTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('rounds');

  // 마지막 라운드의 캡테이블
  const lastCapTable = rounds.length > 0 ? getCapTableAtRound(rounds.length - 1) : [];

  // 라운드 요약 정보
  const totalInvestment = rounds.reduce((sum, r) => sum + r.investmentAmount, 0);
  const lastRound = rounds[rounds.length - 1];
  const postMoneyValuation = lastRound?.postMoneyValuation || 0;

  if (rounds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <p className="text-lg mb-2">아직 라운드가 없습니다</p>
        <p className="text-sm text-slate-400">데스크톱에서 라운드를 추가해주세요</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 요약 정보 */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="text-slate-500">총 투자금</span>
            <p className="font-bold text-emerald-600">{fmtMoney(totalInvestment)}</p>
          </div>
          <div className="text-right">
            <span className="text-slate-500">기업가치</span>
            <p className="font-bold">{fmtMoney(postMoneyValuation)}</p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('rounds')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'rounds'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          라운드별 ({rounds.length})
        </button>
        <button
          onClick={() => setActiveTab('investors')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'investors'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          투자자별 ({lastCapTable.filter(h => h.shares > 0).length})
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {activeTab === 'rounds' ? (
          <div className="space-y-4">
            {rounds.map((round, idx) => (
              <MobileRoundCard
                key={round.id}
                round={round}
                investors={investors}
                capTable={getCapTableAtRound(idx)}
                prevRound={idx > 0 ? rounds[idx - 1] : undefined}
              />
            ))}
          </div>
        ) : (
          <MobileInvestorList
            investors={investors}
            rounds={rounds}
            capTable={lastCapTable}
          />
        )}
      </div>
    </div>
  );
}
