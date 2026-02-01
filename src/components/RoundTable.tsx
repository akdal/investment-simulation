import { useState, useRef, useEffect } from 'react';
import type { Round, Investor, Shareholding, InvestorGroup } from '../types';
import { Plus, AlertCircle, ChevronRight } from 'lucide-react';

interface RoundTableProps {
    rounds: Round[];
    investors: Investor[];
    investorGroups: InvestorGroup[];
    selectedRoundId: string | null;
    onSelectRound: (roundId: string) => void;
    onAddRound: () => void;
    getCapTableAtRound: (roundIndex: number) => Shareholding[];
    isCompactView?: boolean;
}

export function RoundTable({
    rounds,
    investors,
    investorGroups,
    selectedRoundId,
    onSelectRound,
    onAddRound,
    getCapTableAtRound,
    isCompactView = false,
}: RoundTableProps) {
    const fmt = (n: number) => n.toLocaleString();

    // 스크롤 상태 추적
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const checkScroll = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
        };

        checkScroll();
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [rounds]);

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
        <div className="h-full relative">
            {/* 왼쪽 흰색 오버레이 - 스크롤 시 내용 가림 */}
            <div className="absolute left-0 top-0 w-6 h-full bg-white z-30 pointer-events-none" />

            {/* 오른쪽 그라데이션 페이드 & 화살표 힌트 */}
            {canScrollRight && (
                <div className="absolute right-0 top-0 h-full z-30 pointer-events-none flex items-center">
                    <div className="w-32 h-full bg-gradient-to-l from-white via-white/70 to-transparent" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-md border border-slate-300">
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </div>
                </div>
            )}

            <div
                ref={scrollContainerRef}
                className="h-full overflow-auto p-6 bg-gradient-to-b from-white to-slate-50/50 custom-scrollbar"
            >
                <div className="min-w-fit">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        {/* 라운드 헤더 */}
                        <tr className="border-b border-slate-200">
                            <th className="w-[200px] min-w-[200px] py-4 sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]"></th>
                            {rounds.map((round, roundIdx) => {
                                const roundDate = round.date ? new Date(round.date) : null;
                                const dateStr = roundDate
                                    ? `${roundDate.getFullYear()}년 ${roundDate.getMonth() + 1}월`
                                    : null;
                                return (
                                    <th
                                        key={round.id}
                                        onClick={() => onSelectRound(round.id)}
                                        className={`w-[200px] min-w-[200px] px-3 py-4 text-center cursor-pointer transition-all duration-150 ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id
                                            ? 'bg-blue-50 border-l border-r border-slate-500 shadow-[inset_0_-3px_0_0_theme(colors.slate.500)]'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`font-bold transition-colors duration-150 ${selectedRoundId === round.id ? 'text-slate-900' : 'text-slate-900'}`}>{round.name}</div>
                                        {dateStr && (
                                            <div className={`text-xs font-normal mt-0.5 transition-colors duration-150 ${selectedRoundId === round.id ? 'text-slate-500' : 'text-slate-400'}`}>{dateStr}</div>
                                        )}
                                    </th>
                                );
                            })}
                            <th className="w-[80px] min-w-[80px] py-4 border-l border-slate-200">
                                <button
                                    onClick={onAddRound}
                                    className="mx-auto flex items-center justify-center w-7 h-7 rounded border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 transition-colors"
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
                            <th className="py-1.5 px-3 text-left text-slate-900 font-semibold sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]">프리 머니</th>
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
                                        className={`py-1.5 px-3 text-right cursor-pointer transition-colors duration-150 ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-end gap-1.5">
                                            {multiple !== null && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${Math.round(multiple * 10) / 10 === 1
                                                    ? 'bg-slate-50 text-slate-500'
                                                    : multiple < 1
                                                        ? 'bg-red-50 text-red-600'
                                                        : 'bg-emerald-50 text-emerald-600'
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
                            <td className="py-1.5 px-3 border-l border-slate-200 border-r border-slate-200 bg-white"></td>
                            <td></td>
                        </tr>
                        <tr className="bg-white text-sm">
                            <th className="py-1.5 px-3 text-left text-emerald-600 font-semibold sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]">투자금</th>
                            {rounds.map((round, roundIdx) => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`py-1.5 px-3 text-right cursor-pointer transition-colors duration-150 ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                        }`}
                                >
                                    <span className={`text-sm font-bold ${round.investmentAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {fmtMoney(round.investmentAmount)}
                                    </span>
                                </td>
                            ))}
                            <td className="border-l border-slate-200 bg-white"></td>
                            <td className="py-1.5 px-3 text-right border-l border-slate-200 border-r border-slate-200 bg-white">
                                <div className="flex flex-col items-end">
                                    <div className="grid grid-cols-[18px_1fr] items-center gap-1.5 w-full">
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
                            <th className="py-1.5 px-3 text-left text-slate-900 font-semibold sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]">포스트 머니</th>
                            {rounds.map((round, roundIdx) => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`py-1.5 px-3 text-right cursor-pointer transition-colors duration-150 font-bold ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                        }`}
                                >
                                    {fmtMoney(round.postMoneyValuation)}
                                </td>
                            ))}
                            <td className="border-l border-slate-200"></td>
                            <td className="py-1.5 px-3 border-l border-slate-200 border-r border-slate-200 bg-white"></td>
                            <td></td>
                        </tr>
                        <tr className="text-xs bg-white border-t border-slate-200">
                            <th className="py-1 px-3 text-left text-slate-900 font-medium sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]">주당 가격</th>
                            {rounds.map((round, roundIdx) => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`py-1 px-3 text-right cursor-pointer transition-colors duration-150 text-xs ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                        }`}
                                >
                                    {fmt(round.sharePrice)}원
                                </td>
                            ))}
                            <td className="border-l border-slate-200"></td>
                            <td className="border-l border-slate-200 border-r border-slate-200"></td>
                            <td></td>
                        </tr>
                        <tr className="text-xs bg-white">
                            <th className="py-1 px-3 text-left text-emerald-600 font-medium sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]">신규 발행주식</th>
                            {rounds.map((round, roundIdx) => (
                                <td
                                    key={round.id}
                                    onClick={() => onSelectRound(round.id)}
                                    className={`py-1 px-3 text-right cursor-pointer transition-colors duration-150 text-xs ${round.totalNewShares > 0 ? 'text-emerald-600' : 'text-slate-400'} ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                        }`}
                                >
                                    {fmt(round.totalNewShares)}주
                                </td>
                            ))}
                            <td className="border-l border-slate-200 bg-white"></td>
                            <td className="border-l border-slate-200 border-r border-slate-200 bg-white"></td>
                            <td></td>
                        </tr>
                        <tr className="text-xs bg-white border-b-2 border-slate-300">
                            <th className="py-1 px-3 text-left text-slate-900 font-medium sticky left-0 bg-white z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)]">총 발행주식</th>
                            {rounds.map((round, roundIdx) => {
                                const capTable = getCapTableAtRound(roundIdx);
                                const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);
                                return (
                                    <td
                                        key={round.id}
                                        onClick={() => onSelectRound(round.id)}
                                        className={`py-1 px-3 text-right cursor-pointer transition-colors duration-150 text-xs ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
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
                            <td className="pt-4 pb-2 px-3 sticky left-0 bg-white z-10">
                                <span className="text-xs text-slate-500 font-medium">투자자별 지분</span>
                            </td>
                            <td colSpan={rounds.length + 3}></td>
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
                                            className={`group transition-colors ${isLastInvestor ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'} ${isEvenRow ? 'bg-white' : 'bg-slate-50'}                                                 } `}
                                        >
                                            <td className={`py-2 px-3 font-semibold text-slate-900 sticky left-0 z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)] align-top ${isEvenRow ? 'bg-white' : 'bg-slate-50'}  ${isLastInvestor ? 'border-b-2 border-slate-300' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-normal">
                                                        {rowIdx + 1}
                                                    </span>
                                                    <span className="truncate leading-5">{investor?.name || '알 수 없음'}</span>
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
                                                        className={`py-2 px-3 text-right cursor-pointer transition-colors duration-150 align-top ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                                            }`}
                                                    >
                                                        {shares > 0 || hasActivity ? (
                                                            <div>
                                                                {/* 지분율 - 항상 표시 */}
                                                                <div className={`leading-5 pb-0.5 ${isMaxShareholder ? 'font-bold text-blue-800' : 'font-medium'}`}>
                                                                    {percentage.toFixed(1)}%
                                                                </div>

                                                                {/* 활동 + 평가금액 + 주수를 한 줄에 */}
                                                                <div className="flex items-center justify-end gap-1 text-[10px]">
                                                                    {newInvestmentShares > 0 && (
                                                                        <span className="text-emerald-600 font-medium whitespace-nowrap">
                                                                            투자 {fmtMoney(newInvestmentAmount)}
                                                                        </span>
                                                                    )}
                                                                    {secondaryBuyShares > 0 && (
                                                                        <span className="text-amber-600 font-medium whitespace-nowrap">
                                                                            매수 {fmtMoney(secondaryBuyAmount)}
                                                                        </span>
                                                                    )}
                                                                    {secondarySellShares > 0 && (
                                                                        <span className="text-violet-600 font-medium whitespace-nowrap">
                                                                            매도 {fmtMoney(secondarySellAmount)}
                                                                        </span>
                                                                    )}
                                                                    {/* 평가금액 - 항상 표시 */}
                                                                    <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded whitespace-nowrap">
                                                                        {fmtMoney(Math.round(value))}
                                                                    </span>
                                                                    {/* 주식수 - 상세 뷰에서만 */}
                                                                    {!isCompactView && (
                                                                        <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded whitespace-nowrap">
                                                                            {fmt(shares)}주
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="border-l border-slate-200 align-top"></td>
                                            {/* 요약 열 */}
                                            <td className="py-2 px-3 border-l border-slate-200 border-r border-slate-200 text-right align-top">
                                                <div className="flex flex-col items-end gap-0 text-[10px] leading-4">
                                                    {summary.primaryInvestment > 0 && (
                                                        <div className="grid grid-cols-[18px_1fr] items-center w-full text-emerald-600">
                                                            <span className="text-left">투자</span>
                                                            <span className="font-medium justify-self-end">{fmtMoney(summary.primaryInvestment)}</span>
                                                        </div>
                                                    )}
                                                    {summary.secondaryBuy > 0 && (
                                                        <div className="grid grid-cols-[18px_1fr] items-center w-full text-amber-600">
                                                            <span className="text-left">매수</span>
                                                            <span className="font-medium justify-self-end">{fmtMoney(summary.secondaryBuy)}</span>
                                                        </div>
                                                    )}
                                                    {summary.secondarySell > 0 && (
                                                        <div className="grid grid-cols-[18px_1fr] items-center w-full text-violet-600">
                                                            <span className="text-left">매도</span>
                                                            <span className="font-medium justify-self-end">{fmtMoney(summary.secondarySell)}</span>
                                                        </div>
                                                    )}
                                                    {summary.currentValue > 0 && (
                                                        <div className="grid grid-cols-[18px_1fr] items-center w-full text-slate-600">
                                                            <span className="text-left">보유</span>
                                                            <span className="font-medium justify-self-end">{fmtMoney(Math.round(summary.currentValue))}</span>
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

                                const activeGroups = investorGroups
                                    .filter(g => groupInvestorMap.has(g.id))
                                    .sort((a, b) => (a.order || 0) - (b.order || 0));

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
                                            <td className="pt-6 pb-2 px-3 border-t-2 border-slate-300 sticky left-0 bg-white z-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-medium">그룹별 지분</span>
                                                    {isGroupIncomplete && (
                                                        <span className="flex items-center gap-1 text-[10px] text-amber-600">
                                                            <AlertCircle className="h-3 w-3" />
                                                            그룹 미지정 투자자 있음
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td colSpan={rounds.length + 3} className="border-t-2 border-slate-300"></td>
                                        </tr>
                                        {activeGroups.map((group, groupIdx) => {
                                            const groupInvestorIds = groupInvestorMap.get(group.id) || [];
                                            const isEvenRow = groupIdx % 2 === 0;
                                            const isLastGroup = groupIdx === activeGroups.length - 1;
                                            const groupSummary = getGroupSummary(groupInvestorIds);

                                            return (
                                                <tr
                                                    key={group.id}
                                                    className={`group transition-colors ${isLastGroup ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'} ${isEvenRow ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100/10`}
                                                >
                                                    <td className={`py-2 px-3 font-semibold text-slate-900 sticky left-0 z-10 shadow-[inset_-1px_0_0_0_theme(colors.slate.200)] align-top ${isEvenRow ? 'bg-white' : 'bg-slate-50'}  ${isLastGroup ? 'border-b-2 border-slate-300' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0 font-normal">
                                                                G
                                                            </span>
                                                            <span className="truncate leading-5">{group.name}</span>
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
                                                                className={`py-2 px-3 text-right cursor-pointer transition-colors duration-150 align-top ${roundIdx > 0 && selectedRoundId !== round.id ? 'border-l border-slate-200' : ''} ${selectedRoundId === round.id ? 'border-l border-r border-slate-500' : ''
                                                                    }`}
                                                            >
                                                                {groupShares > 0 || hasActivity ? (
                                                                    <div>
                                                                        {/* 지분율 - 항상 표시 */}
                                                                        <div className={`leading-5 pb-0.5 ${isMaxGroup ? 'font-bold text-blue-800' : 'font-medium'}`}>
                                                                            {percentage.toFixed(1)}%
                                                                        </div>

                                                                        {/* 활동 + 평가금액 + 주수를 한 줄에 */}
                                                                        <div className="flex items-center justify-end gap-1 text-[10px]">
                                                                            {groupNewInvestmentShares > 0 && (
                                                                                <span className="text-emerald-600 font-medium whitespace-nowrap">
                                                                                    투자 {fmtMoney(groupNewInvestmentAmount)}
                                                                                </span>
                                                                            )}
                                                                            {groupSecondaryBuyShares > 0 && (
                                                                                <span className="text-amber-600 font-medium whitespace-nowrap">
                                                                                    매수 {fmtMoney(groupSecondaryBuyAmount)}
                                                                                </span>
                                                                            )}
                                                                            {groupSecondarySellShares > 0 && (
                                                                                <span className="text-violet-600 font-medium whitespace-nowrap">
                                                                                    매도 {fmtMoney(groupSecondarySellAmount)}
                                                                                </span>
                                                                            )}
                                                                            {/* 평가금액 - 항상 표시 */}
                                                                            <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded whitespace-nowrap">
                                                                                {fmtMoney(Math.round(value))}
                                                                            </span>
                                                                            {/* 주식수 - 상세 뷰에서만 */}
                                                                            {!isCompactView && (
                                                                                <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded whitespace-nowrap">
                                                                                    {fmt(groupShares)}주
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-l border-slate-200 align-top"></td>
                                                    {/* 요약 열 */}
                                                    <td className="py-2 px-3 border-l border-slate-200 border-r border-slate-200 text-right align-top">
                                                        <div className="flex flex-col items-end gap-0 text-[10px] leading-4">
                                                            {groupSummary.primaryInvestment > 0 && (
                                                                <div className="grid grid-cols-[18px_1fr] items-center w-full text-emerald-600">
                                                                    <span className="text-left">투자</span>
                                                                    <span className="font-medium justify-self-end">{fmtMoney(groupSummary.primaryInvestment)}</span>
                                                                </div>
                                                            )}
                                                            {groupSummary.secondaryBuy > 0 && (
                                                                <div className="grid grid-cols-[18px_1fr] items-center w-full text-amber-600">
                                                                    <span className="text-left">매수</span>
                                                                    <span className="font-medium justify-self-end">{fmtMoney(groupSummary.secondaryBuy)}</span>
                                                                </div>
                                                            )}
                                                            {groupSummary.secondarySell > 0 && (
                                                                <div className="grid grid-cols-[18px_1fr] items-center w-full text-violet-600">
                                                                    <span className="text-left">매도</span>
                                                                    <span className="font-medium justify-self-end">{fmtMoney(groupSummary.secondarySell)}</span>
                                                                </div>
                                                            )}
                                                            {groupSummary.currentValue > 0 && (
                                                                <div className="grid grid-cols-[18px_1fr] items-center w-full text-slate-600">
                                                                    <span className="text-left">보유</span>
                                                                    <span className="font-medium justify-self-end">{fmtMoney(Math.round(groupSummary.currentValue))}</span>
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
        </div>
    );
}
