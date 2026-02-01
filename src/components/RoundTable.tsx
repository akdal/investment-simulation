import type { Round, Investor, Shareholding, InvestorGroup } from '../types';
import { Plus, AlertCircle } from 'lucide-react';

interface RoundTableProps {
    rounds: Round[];
    investors: Investor[];
    investorGroups: InvestorGroup[];
    selectedRoundId: string | null;
    onSelectRound: (roundId: string) => void;
    onAddRound: () => void;
    getCapTableAtRound: (roundIndex: number) => Shareholding[];
}

export function RoundTable({
    rounds,
    investors,
    investorGroups,
    selectedRoundId,
    onSelectRound,
    onAddRound,
    getCapTableAtRound,
}: RoundTableProps) {
    const fmt = (n: number) => n.toLocaleString();

    // 투자자별 총 투자/매수/회수/잔액 계산
    const getInvestorSummary = (investorId: string) => {
        let primaryInvestment = 0;  // 신주 투자
        let secondaryBuy = 0;       // 구주 매수
        let secondarySell = 0;      // 구주 매도 (회수)

        rounds.forEach(round => {
            // 신주 투자 (primary)
            round.investments
                .filter(inv => inv.investorId === investorId && !inv.isSecondary)
                .forEach(inv => { primaryInvestment += inv.amount; });

            // 구주 매수 (secondary buy)
            round.investments
                .filter(inv => inv.investorId === investorId && inv.isSecondary)
                .forEach(inv => { secondaryBuy += inv.amount; });

            // 구주 매도 (secondary sell)
            round.investments
                .filter(inv => inv.sellerId === investorId && inv.isSecondary)
                .forEach(inv => { secondarySell += inv.amount; });
        });

        // 잔액: 최종 라운드 기준 POST 평가액
        let currentValue = 0;
        if (rounds.length > 0) {
            const lastRound = rounds[rounds.length - 1];
            const lastCapTable = getCapTableAtRound(rounds.length - 1);
            const holding = lastCapTable.find(h => h.investorId === investorId);
            const totalShares = lastCapTable.reduce((sum, h) => sum + h.shares, 0);
            if (holding && totalShares > 0 && lastRound.postMoneyValuation > 0) {
                currentValue = (holding.shares / totalShares) * lastRound.postMoneyValuation;
            }
        }

        return { primaryInvestment, secondaryBuy, secondarySell, currentValue };
    };

    // 그룹별 총 투자/매수/회수/잔액 계산
    const getGroupSummary = (groupInvestorIds: string[]) => {
        let primaryInvestment = 0;
        let secondaryBuy = 0;
        let secondarySell = 0;
        let currentValue = 0;

        groupInvestorIds.forEach(investorId => {
            const summary = getInvestorSummary(investorId);
            primaryInvestment += summary.primaryInvestment;
            secondaryBuy += summary.secondaryBuy;
            secondarySell += summary.secondarySell;
            currentValue += summary.currentValue;
        });

        return { primaryInvestment, secondaryBuy, secondarySell, currentValue };
    };

    // 금액을 억/만 단위로 포맷 (억원만 소수점 1자리, 만원은 정수)
    const fmtMoney = (n: number): string => {
        if (n >= 100_000_000) {
            const billions = n / 100_000_000;
            // 억원 단위: 소수점 1자리까지 (0이면 생략)
            const rounded = Math.round(billions * 10) / 10;
            return rounded % 1 === 0
                ? `${rounded.toLocaleString()}억원`
                : `${rounded.toFixed(1)}억원`;
        } else if (n >= 10_000) {
            // 만원 단위: 정수로 반올림
            const tenThousands = Math.round(n / 10_000);
            return `${tenThousands.toLocaleString()}만원`;
        }
        return `${n.toLocaleString()}원`;
    };

    // 모든 라운드에서 등장하는 투자자 ID 수집
    const allInvestorIds = new Set<string>();
    rounds.forEach(round => {
        round.investments.forEach(inv => {
            allInvestorIds.add(inv.investorId);
        });
    });

    const investorIds = Array.from(allInvestorIds);

    if (rounds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p className="mb-4 text-lg">아직 라운드가 없습니다.</p>
                <p className="mb-6 text-sm text-slate-400">첫 번째 라운드를 추가해서 시뮬레이션을 시작하세요.</p>
                <button
                    onClick={onAddRound}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    첫 번째 라운드 추가
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6 bg-gradient-to-b from-white to-slate-50/50">
            <div className="min-w-fit">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        {/* 라운드 헤더 */}
                        <tr className="border-b border-slate-200">
                            <th className="w-[200px] min-w-[200px] py-4"></th>
                            {rounds.map((round) => {
                                const roundDate = round.date ? new Date(round.date) : null;
                                const dateStr = roundDate
                                    ? `${roundDate.getFullYear()}년 ${roundDate.getMonth() + 1}월`
                                    : null;
                                return (
                                    <th
                                        key={round.id}
                                        onClick={() => onSelectRound(round.id)}
                                        className={`w-[200px] min-w-[200px] px-2 py-4 text-center cursor-pointer transition-all duration-150 border-l border-slate-200 ${selectedRoundId === round.id
                                            ? 'bg-blue-50/60 shadow-[inset_0_-2px_0_0_theme(colors.blue.500)]'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`font-bold transition-colors duration-150 ${selectedRoundId === round.id ? 'text-blue-600' : 'text-slate-900'}`}>{round.name}</div>
                                        {dateStr && (
                                            <div className={`text-xs font-normal mt-0.5 transition-colors duration-150 ${selectedRoundId === round.id ? 'text-blue-400' : 'text-slate-400'}`}>{dateStr}</div>
                                        )}
                                    </th>
                                );
                            })}
                            <th className="w-[60px] min-w-[60px] py-4 border-l border-slate-200">
                                <button
                                    onClick={onAddRound}
                                    className="mx-auto flex items-center justify-center w-7 h-7 rounded border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    <Plus className="h-4 w-4 text-slate-400" />
                                </button>
                            </th>
                            <th className="w-[120px] min-w-[120px] py-4 border-l border-slate-200 border-r border-slate-200 text-center">
                                <div className="font-bold text-slate-900">요약</div>
                                <div className="text-xs font-normal text-slate-400 mt-0.5">Summary</div>
                            </th>
                            <th className="w-auto border-r border-slate-200"></th>
                        </tr>

                        {/* 라운드 요약 정보 */}
                        <tr className="bg-white text-sm">
                            <th className="p-2 text-left text-slate-900 font-bold sticky left-0 bg-white z-10">프리머니</th>
                            {rounds.map((round, roundIdx) => {
                                // 직전 라운드 대비 배수 계산
                                const prevRound = roundIdx > 0 ? rounds[roundIdx - 1] : null;
                                const prevPostMoney = prevRound?.postMoneyValuation || 0;
                                const multiple = prevPostMoney > 0 && round.preMoneyValuation > 0
                                    ? round.preMoneyValuation / prevPostMoney
                                    : null;

                                // 배수 포맷: 정수면 정수로, 아니면 소수점 1자리
                                const formatMultiple = (m: number) => {
                                    const rounded = Math.round(m * 10) / 10;
                                    return rounded % 1 === 0 ? `${rounded}x` : `${rounded.toFixed(1)}x`;
                                };



                                return (
                                    <td
                                        key={round.id}
                                        onClick={() => onSelectRound(round.id)}
                                        className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-end gap-1.5">
                                            {multiple !== null && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${Math.round(multiple * 10) / 10 === 1
                                                    ? 'bg-slate-50 text-slate-500'
                                                    : multiple < 1
                                                        ? 'bg-red-50 text-red-500'
                                                        : 'bg-emerald-50 text-emerald-500'
                                                    }`}>
                                                    {formatMultiple(multiple)}
                                                </span>
                                            )}
                                            <span className="font-bold">{fmtMoney(round.preMoneyValuation)}</span>
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="border-l border-slate-200"></td>
                            <td className="border-l border-slate-200 border-r border-slate-200 bg-white"></td>
                            <td></td>
                        </tr>
                        <tr className="bg-white text-sm">
                            <th className="p-2 text-left text-slate-900 font-bold sticky left-0 bg-white z-10">투자금</th>
                            {rounds.map(round => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    <span className={`text-sm font-bold ${round.investmentAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {fmtMoney(round.investmentAmount)}
                                    </span>
                                </td>
                            ))}
                            <td className="border-l border-slate-200"></td>
                            <td className="p-2 text-right border-l border-slate-200 border-r border-slate-200 bg-white">
                                <div className="flex flex-col gap-0.5 items-end">
                                    <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                        <span className="text-[10px] text-slate-400 text-left">누적</span>
                                        <div className="justify-self-end">
                                            <span className="text-sm font-bold text-emerald-600">
                                                {fmtMoney(rounds.reduce((sum, r) => sum + r.investmentAmount, 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td></td>
                        </tr>
                        <tr className="bg-white text-sm">
                            <th className="p-2 text-left text-slate-900 font-bold sticky left-0 bg-white z-10">포스트머니</th>
                            {rounds.map(round => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 font-bold ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    {fmtMoney(round.postMoneyValuation)}
                                </td>
                            ))}
                            <td className="border-l border-slate-200"></td>
                            <td className="border-l border-slate-200 border-r border-slate-200 bg-white"></td>
                            <td></td>
                        </tr>
                        <tr className="text-xs border-t border-slate-100">
                            <th className="p-2 text-left text-slate-900 font-normal sticky left-0 bg-white z-10">주당 가격</th>
                            {rounds.map(round => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 text-xs ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    {fmt(round.sharePrice)}원
                                </td>
                            ))}
                            <td className="border-l border-slate-200"></td>
                            <td className="border-l border-slate-200 border-r border-slate-200"></td>
                            <td></td>
                        </tr>
                        <tr className="text-xs bg-white border-b border-slate-200">
                            <th className="p-2 text-left text-slate-900 font-normal sticky left-0 bg-inherit z-10">총 발행주식</th>
                            {rounds.map((round, roundIdx) => {
                                const capTable = getCapTableAtRound(roundIdx);
                                const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);
                                return (
                                    <td
                                        key={round.id}
                                        onClick={() => onSelectRound(round.id)}
                                        className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 text-xs ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                            }`}
                                    >
                                        {fmt(totalShares)}주
                                    </td>
                                );
                            })}
                            <td className="border-l border-slate-200"></td>
                            <td className="border-l border-slate-200 border-r border-slate-200"></td>
                            <td></td>
                        </tr>
                    </thead>

                    <tbody>
                        {/* 투자자 섹션 헤더 */}
                        <tr>
                            <td colSpan={rounds.length + 4} className="pt-4 pb-2 px-2">
                                <span className="text-xs text-slate-500 font-medium">투자자별 지분</span>
                            </td>
                        </tr>

                        {investorIds.length === 0 ? (
                            <tr>
                                <td colSpan={rounds.length + 4} className="text-center py-6 text-slate-400 text-xs">
                                    라운드를 선택하고 투자자를 추가하세요.
                                </td>
                            </tr>
                        ) : (
                            (() => {
                                // 각 라운드별 최대 주주 계산
                                const maxShareholderByRound = rounds.map((_, roundIdx) => {
                                    const capTable = getCapTableAtRound(roundIdx);
                                    if (capTable.length === 0) return null;
                                    const maxHolding = capTable.reduce((max, h) =>
                                        h.shares > max.shares ? h : max
                                        , capTable[0]);
                                    return maxHolding.investorId;
                                });

                                return investorIds.map((investorId, rowIdx) => {
                                    const investor = investors.find(i => i.id === investorId);
                                    const isEvenRow = rowIdx % 2 === 0;
                                    const isLastInvestor = rowIdx === investorIds.length - 1;
                                    const summary = getInvestorSummary(investorId);

                                    return (
                                        <tr
                                            key={investorId}
                                            className={`transition-colors ${isLastInvestor ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'} ${isEvenRow ? 'bg-white' : 'bg-slate-100/50'
                                                } hover:bg-slate-100`}
                                        >
                                            <td className={`p-2 font-medium text-slate-900 sticky left-0 bg-inherit ${isLastInvestor ? 'border-b-2 border-slate-300' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0">
                                                        {rowIdx + 1}
                                                    </span>
                                                    <span className="truncate">{investor?.name || '알 수 없음'}</span>
                                                </div>
                                            </td>
                                            {rounds.map((round, roundIdx) => {
                                                const capTable = getCapTableAtRound(roundIdx);
                                                const holding = capTable.find(h => h.investorId === investorId);
                                                const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);
                                                const shares = holding?.shares || 0;
                                                const percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0;
                                                const value = round.postMoneyValuation > 0 && totalShares > 0
                                                    ? (shares / totalShares) * round.postMoneyValuation
                                                    : 0;
                                                const isMaxShareholder = maxShareholderByRound[roundIdx] === investorId && shares > 0;

                                                // 신규 투자 (primary)
                                                const primaryInvestments = round.investments.filter(inv => inv.investorId === investorId && !inv.isSecondary);
                                                const newInvestmentAmount = primaryInvestments.reduce((sum, inv) => sum + inv.amount, 0);
                                                const newInvestmentShares = primaryInvestments.reduce((sum, inv) => sum + inv.shares, 0);

                                                // 구주 매수 (secondary buy)
                                                const secondaryBuys = round.investments.filter(inv => inv.investorId === investorId && inv.isSecondary);
                                                const secondaryBuyAmount = secondaryBuys.reduce((sum, inv) => sum + inv.amount, 0);
                                                const secondaryBuyShares = secondaryBuys.reduce((sum, inv) => sum + inv.shares, 0);

                                                // 구주 매각 (secondary sell)
                                                const secondarySells = round.investments.filter(inv => inv.sellerId === investorId && inv.isSecondary);
                                                const secondarySellAmount = secondarySells.reduce((sum, inv) => sum + inv.amount, 0);
                                                const secondarySellShares = secondarySells.reduce((sum, inv) => sum + inv.shares, 0);

                                                const hasActivity = newInvestmentShares > 0 || secondaryBuyShares > 0 || secondarySellShares > 0;

                                                return (
                                                    <td
                                                        key={round.id}
                                                        onClick={() => onSelectRound(round.id)}
                                                        className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                                            }`}
                                                    >
                                                        {shares > 0 || hasActivity ? (
                                                            <div className="space-y-0.5">
                                                                {/* 지분율 */}
                                                                <div className={`font-medium ${isMaxShareholder ? 'text-blue-600' : ''}`}>
                                                                    {percentage.toFixed(1)}%
                                                                </div>

                                                                {/* POST 평가금액, 보유주수 */}
                                                                <div className="flex items-center justify-end gap-1 text-[10px]">
                                                                    <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                                        {fmtMoney(Math.round(value))}
                                                                    </span>
                                                                    <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                                        {fmt(shares)}주
                                                                    </span>
                                                                </div>

                                                                {/* 신규 투자 */}
                                                                {newInvestmentShares > 0 && (
                                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                        <span className={`text-[10px] font-medium whitespace-nowrap ${newInvestmentAmount > 0
                                                                            ? 'text-emerald-500'
                                                                            : 'text-slate-400'
                                                                            }`}>
                                                                            {newInvestmentAmount > 0 ? `투자 ${fmtMoney(newInvestmentAmount)} (${fmt(newInvestmentShares)}주)` : `${fmt(newInvestmentShares)}주`}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* 구주 매수 */}
                                                                {secondaryBuyShares > 0 && (
                                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                        <span className={`text-[10px] font-medium whitespace-nowrap ${secondaryBuyAmount > 0
                                                                            ? 'text-amber-500'
                                                                            : 'text-slate-400'
                                                                            }`}>
                                                                            {secondaryBuyAmount > 0 ? `매수 ${fmtMoney(secondaryBuyAmount)} (${fmt(secondaryBuyShares)}주)` : `${fmt(secondaryBuyShares)}주`}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* 구주 매각 */}
                                                                {secondarySellShares > 0 && (
                                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                        <span className={`text-[10px] font-medium whitespace-nowrap ${secondarySellAmount > 0
                                                                            ? 'text-violet-500'
                                                                            : 'text-slate-400'
                                                                            }`}>
                                                                            {secondarySellAmount > 0 ? `매도 ${fmtMoney(secondarySellAmount)} (${fmt(secondarySellShares)}주)` : `${fmt(secondarySellShares)}주`}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="border-l border-slate-200"></td>
                                            {/* 요약 열 */}
                                            <td className="p-2 border-l border-slate-200 border-r border-slate-200 text-right">
                                                <div className="flex flex-col gap-0.5 items-end">
                                                    {summary.primaryInvestment > 0 && (
                                                        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                            <span className="text-[10px] text-slate-400 text-left">투자</span>
                                                            <div className="justify-self-end">
                                                                <span className="text-[10px] text-emerald-500 font-medium">
                                                                    {fmtMoney(summary.primaryInvestment)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {summary.secondaryBuy > 0 && (
                                                        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                            <span className="text-[10px] text-slate-400 text-left">매수</span>
                                                            <div className="justify-self-end">
                                                                <span className="text-[10px] text-amber-500 font-medium">
                                                                    {fmtMoney(summary.secondaryBuy)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {summary.secondarySell > 0 && (
                                                        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                            <span className="text-[10px] text-slate-400 text-left">회수</span>
                                                            <div className="justify-self-end">
                                                                <span className="text-[10px] text-violet-500 font-medium">
                                                                    {fmtMoney(summary.secondarySell)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {summary.currentValue > 0 && (
                                                        <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                            <span className="text-[10px] text-slate-400 text-left">보유</span>
                                                            <div className="justify-self-end">
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {fmtMoney(Math.round(summary.currentValue))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className=""></td>
                                        </tr>
                                    );
                                });
                            })()
                        )}

                        {/* 그룹별 지분 요약 */}
                        {investorGroups.length > 0 && investorIds.length > 0 && (
                            (() => {
                                // 각 그룹의 투자자 ID 맵
                                const groupInvestorMap = new Map<string, string[]>();
                                investorGroups.forEach(group => {
                                    const ids = investors
                                        .filter(inv => inv.groupId === group.id)
                                        .map(inv => inv.id);
                                    if (ids.length > 0) {
                                        groupInvestorMap.set(group.id, ids);
                                    }
                                });

                                // 각 라운드별 최대 그룹 계산
                                const maxGroupByRound = rounds.map((_, roundIdx) => {
                                    const capTable = getCapTableAtRound(roundIdx);
                                    let maxGroupId: string | null = null;
                                    let maxShares = 0;

                                    groupInvestorMap.forEach((investorIds, groupId) => {
                                        const groupShares = capTable
                                            .filter(h => investorIds.includes(h.investorId))
                                            .reduce((sum, h) => sum + h.shares, 0);
                                        if (groupShares > maxShares) {
                                            maxShares = groupShares;
                                            maxGroupId = groupId;
                                        }
                                    });

                                    return maxGroupId;
                                });

                                const activeGroups = investorGroups.filter(g => groupInvestorMap.has(g.id));

                                // 마지막 라운드에서 그룹에 속한 투자자들의 지분 합계 계산
                                const lastRoundCapTable = getCapTableAtRound(rounds.length - 1);
                                const lastRoundTotalShares = lastRoundCapTable.reduce((sum, h) => sum + h.shares, 0);

                                // 모든 그룹에 속한 투자자들의 주식 합계
                                const allGroupedInvestorIds = new Set<string>();
                                groupInvestorMap.forEach(ids => ids.forEach(id => allGroupedInvestorIds.add(id)));

                                const groupedShares = lastRoundCapTable
                                    .filter(h => allGroupedInvestorIds.has(h.investorId))
                                    .reduce((sum, h) => sum + h.shares, 0);

                                const groupTotalPercentage = lastRoundTotalShares > 0
                                    ? (groupedShares / lastRoundTotalShares) * 100
                                    : 0;
                                const isGroupIncomplete = Math.abs(groupTotalPercentage - 100) > 0.01;

                                return (
                                    <>
                                        <tr>
                                            <td colSpan={rounds.length + 4} className="pt-6 pb-2 px-2 border-t-2 border-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-medium">그룹별 지분</span>
                                                    {isGroupIncomplete && (
                                                        <span className="flex items-center gap-1 text-[10px] text-amber-600">
                                                            <AlertCircle className="h-3 w-3" />
                                                            일부 투자자가 그룹에 미배정 ({(100 - groupTotalPercentage).toFixed(1)}%)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {activeGroups.map((group, groupIdx) => {
                                            const groupInvestorIds = groupInvestorMap.get(group.id) || [];
                                            const isEvenRow = groupIdx % 2 === 0;
                                            const isLastGroup = groupIdx === activeGroups.length - 1;
                                            const groupSummary = getGroupSummary(groupInvestorIds);

                                            return (
                                                <tr
                                                    key={group.id}
                                                    className={`transition-colors ${isLastGroup ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'} ${isEvenRow ? 'bg-white' : 'bg-slate-100/50'} hover:bg-slate-100`}
                                                >
                                                    <td className={`p-2 font-medium text-slate-900 sticky left-0 bg-inherit ${isLastGroup ? 'border-b-2 border-slate-300' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0">
                                                                G
                                                            </span>
                                                            <span className="truncate">{group.name}</span>
                                                        </div>
                                                    </td>
                                                    {rounds.map((round, roundIdx) => {
                                                        const capTable = getCapTableAtRound(roundIdx);
                                                        const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);

                                                        const groupShares = capTable
                                                            .filter(h => groupInvestorIds.includes(h.investorId))
                                                            .reduce((sum, h) => sum + h.shares, 0);

                                                        const percentage = totalShares > 0 ? (groupShares / totalShares) * 100 : 0;
                                                        const value = round.postMoneyValuation > 0 && totalShares > 0
                                                            ? (groupShares / totalShares) * round.postMoneyValuation
                                                            : 0;
                                                        const isMaxGroup = maxGroupByRound[roundIdx] === group.id && groupShares > 0;

                                                        // 그룹에 속한 투자자들의 신규 투자
                                                        const groupPrimaryInvestments = round.investments.filter(inv => groupInvestorIds.includes(inv.investorId) && !inv.isSecondary);
                                                        const groupNewInvestmentAmount = groupPrimaryInvestments.reduce((sum, inv) => sum + inv.amount, 0);
                                                        const groupNewInvestmentShares = groupPrimaryInvestments.reduce((sum, inv) => sum + inv.shares, 0);

                                                        // 그룹에 속한 투자자들의 구주 매수
                                                        const groupSecondaryBuys = round.investments.filter(inv => groupInvestorIds.includes(inv.investorId) && inv.isSecondary);
                                                        const groupSecondaryBuyAmount = groupSecondaryBuys.reduce((sum, inv) => sum + inv.amount, 0);
                                                        const groupSecondaryBuyShares = groupSecondaryBuys.reduce((sum, inv) => sum + inv.shares, 0);

                                                        // 그룹에 속한 투자자들의 구주 매각
                                                        const groupSecondarySells = round.investments.filter(inv => inv.sellerId && groupInvestorIds.includes(inv.sellerId) && inv.isSecondary);
                                                        const groupSecondarySellAmount = groupSecondarySells.reduce((sum, inv) => sum + inv.amount, 0);
                                                        const groupSecondarySellShares = groupSecondarySells.reduce((sum, inv) => sum + inv.shares, 0);

                                                        const hasActivity = groupNewInvestmentShares > 0 || groupSecondaryBuyShares > 0 || groupSecondarySellShares > 0;

                                                        return (
                                                            <td
                                                                key={round.id}
                                                                onClick={() => onSelectRound(round.id)}
                                                                className={`p-2 text-right cursor-pointer border-l border-slate-200 transition-colors duration-150 ${selectedRoundId === round.id ? 'bg-blue-50/50' : ''
                                                                    }`}
                                                            >
                                                                {groupShares > 0 || hasActivity ? (
                                                                    <div className="space-y-0.5">
                                                                        {/* 지분율 */}
                                                                        <div className={`font-medium ${isMaxGroup ? 'text-blue-600' : ''}`}>
                                                                            {percentage.toFixed(1)}%
                                                                        </div>

                                                                        {/* POST 평가금액, 보유주수 */}
                                                                        <div className="flex items-center justify-end gap-1 text-[10px]">
                                                                            <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                                                {fmtMoney(Math.round(value))}
                                                                            </span>
                                                                            <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                                                {fmt(groupShares)}주
                                                                            </span>
                                                                        </div>

                                                                        {/* 신규 투자 */}
                                                                        {groupNewInvestmentShares > 0 && (
                                                                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                                <span className={`text-[10px] font-medium whitespace-nowrap ${groupNewInvestmentAmount > 0
                                                                                    ? 'text-emerald-500'
                                                                                    : 'text-slate-400'
                                                                                    }`}>
                                                                                    {groupNewInvestmentAmount > 0 ? `투자 ${fmtMoney(groupNewInvestmentAmount)} (${fmt(groupNewInvestmentShares)}주)` : `${fmt(groupNewInvestmentShares)}주`}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {/* 구주 매수 */}
                                                                        {groupSecondaryBuyShares > 0 && (
                                                                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                                <span className={`text-[10px] font-medium whitespace-nowrap ${groupSecondaryBuyAmount > 0
                                                                                    ? 'text-amber-500'
                                                                                    : 'text-slate-400'
                                                                                    }`}>
                                                                                    {groupSecondaryBuyAmount > 0 ? `매수 ${fmtMoney(groupSecondaryBuyAmount)} (${fmt(groupSecondaryBuyShares)}주)` : `${fmt(groupSecondaryBuyShares)}주`}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {/* 구주 매각 */}
                                                                        {groupSecondarySellShares > 0 && (
                                                                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                                <span className={`text-[10px] font-medium whitespace-nowrap ${groupSecondarySellAmount > 0
                                                                                    ? 'text-violet-500'
                                                                                    : 'text-slate-400'
                                                                                    }`}>
                                                                                    {groupSecondarySellAmount > 0 ? `매도 ${fmtMoney(groupSecondarySellAmount)} (${fmt(groupSecondarySellShares)}주)` : `${fmt(groupSecondarySellShares)}주`}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-l border-slate-200"></td>
                                                    {/* 요약 열 */}
                                                    <td className="p-2 border-l border-slate-200 border-r border-slate-200 text-right">
                                                        <div className="flex flex-col gap-0.5 items-end">
                                                            {groupSummary.primaryInvestment > 0 && (
                                                                <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                                    <span className="text-[10px] text-slate-400 text-left">투자</span>
                                                                    <div className="justify-self-end">
                                                                        <span className="text-[10px] text-emerald-500 font-medium">
                                                                            {fmtMoney(groupSummary.primaryInvestment)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {groupSummary.secondaryBuy > 0 && (
                                                                <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                                    <span className="text-[10px] text-slate-400 text-left">매수</span>
                                                                    <div className="justify-self-end">
                                                                        <span className="text-[10px] text-amber-500 font-medium">
                                                                            {fmtMoney(groupSummary.secondaryBuy)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {groupSummary.secondarySell > 0 && (
                                                                <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                                    <span className="text-[10px] text-slate-400 text-left">회수</span>
                                                                    <div className="justify-self-end">
                                                                        <span className="text-[10px] text-violet-500 font-medium">
                                                                            {fmtMoney(groupSummary.secondarySell)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {groupSummary.currentValue > 0 && (
                                                                <div className="grid grid-cols-[32px_1fr] items-center gap-1.5 w-full">
                                                                    <span className="text-[10px] text-slate-400 text-left">보유</span>
                                                                    <div className="justify-self-end">
                                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                                            {fmtMoney(Math.round(groupSummary.currentValue))}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className=""></td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                );
                            })()
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
