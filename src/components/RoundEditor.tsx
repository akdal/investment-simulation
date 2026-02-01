import { useState, useEffect, useMemo } from 'react';
import type { Round, Investor, Investment } from '../types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { calculateRoundMetrics } from '../lib/calc';
import { handleFormattedNumberInput } from '../lib/utils';
import { Plus, Trash2, User, ArrowRight, X } from 'lucide-react';

// 구주 매매를 investorId로 그룹화하기 위한 타입
interface SecondaryGroup {
    investorId: string;
    investments: Investment[];
}

type InputMode = 'sharePrice' | 'preMoney';

interface RoundEditorProps {
    round: Round;
    previousRoundShares: number;
    allInvestors: Investor[];
    onUpdateRound: (updatedRound: Round) => void;
    onAddInvestor: (name: string, type: Investor['type']) => Investor;
    onDeleteRound: () => void;
    onClose: () => void;
}

export function RoundEditor({
    round,
    previousRoundShares,
    allInvestors,
    onUpdateRound,
    onAddInvestor,
    onDeleteRound,
    onClose
}: RoundEditorProps) {
    // 입력 모드: 주당 발행가격 또는 프리머니
    const [inputMode, setInputMode] = useState<InputMode>('sharePrice');
    const [sharePriceInput, setSharePriceInput] = useState(
        round.sharePrice > 0 ? round.sharePrice.toLocaleString() : ''
    );
    const [preMoneyInput, setPreMoneyInput] = useState(
        round.preMoneyValuation > 0 ? round.preMoneyValuation.toLocaleString() : ''
    );
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isSelectingExisting, setIsSelectingExisting] = useState(false);
    const [newInvestorName, setNewInvestorName] = useState('');

    const fmt = (n: number) => n.toLocaleString();

    // 라운드가 변경되면 입력값 동기화
    useEffect(() => {
        setSharePriceInput(round.sharePrice > 0 ? round.sharePrice.toLocaleString() : '');
        setPreMoneyInput(round.preMoneyValuation > 0 ? round.preMoneyValuation.toLocaleString() : '');
    }, [round.id]);

    const handleSharePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFormattedNumberInput(e, (numVal, formatted) => {
            setSharePriceInput(formatted);
            const metrics = calculateRoundMetrics(numVal, previousRoundShares, round.investments);

            // 프리머니 입력값도 동기화
            setPreMoneyInput(metrics.preMoneyValuation > 0 ? metrics.preMoneyValuation.toLocaleString() : '');

            onUpdateRound({
                ...round,
                sharePrice: numVal,
                preMoneyValuation: metrics.preMoneyValuation,
                totalNewShares: metrics.totalNewShares,
                investmentAmount: metrics.investmentAmount,
                postMoneyValuation: metrics.postMoneyValuation,
                investments: metrics.updatedInvestments
            });
        });
    };

    const handlePreMoneyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFormattedNumberInput(e, (numVal, formatted) => {
            setPreMoneyInput(formatted);

            // 프리머니에서 주당 가격 계산
            const sharePrice = previousRoundShares > 0 ? Math.round(numVal / previousRoundShares) : 0;
            const metrics = calculateRoundMetrics(sharePrice, previousRoundShares, round.investments);

            // 주당 가격 입력값도 동기화
            setSharePriceInput(sharePrice > 0 ? sharePrice.toLocaleString() : '');

            onUpdateRound({
                ...round,
                sharePrice: sharePrice,
                preMoneyValuation: numVal,
                totalNewShares: metrics.totalNewShares,
                investmentAmount: metrics.investmentAmount,
                postMoneyValuation: numVal + metrics.investmentAmount,
                investments: metrics.updatedInvestments
            });
        });
    };

    const commitNewInvestor = () => {
        if (!newInvestorName.trim()) {
            setIsAddingNew(false);
            return;
        }
        const newInv = onAddInvestor(newInvestorName, 'INVESTOR');
        const newInvestment: Investment = {
            id: crypto.randomUUID(),
            investorId: newInv.id,
            amount: 0,
            shares: 0,
            isSecondary: false
        };

        const newInvestments = [...round.investments, newInvestment];
        const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);

        onUpdateRound({
            ...round,
            preMoneyValuation: metrics.preMoneyValuation,
            totalNewShares: metrics.totalNewShares,
            investmentAmount: metrics.investmentAmount,
            postMoneyValuation: metrics.postMoneyValuation,
            investments: metrics.updatedInvestments
        });

        setNewInvestorName('');
        setIsAddingNew(false);
    };

    const selectExistingInvestor = (investorId: string) => {
        if (!investorId) {
            setIsSelectingExisting(false);
            return;
        }
        const newInvestment: Investment = {
            id: crypto.randomUUID(),
            investorId,
            amount: 0,
            shares: 0,
            isSecondary: false
        };
        const newInvestments = [...round.investments, newInvestment];
        const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);

        onUpdateRound({
            ...round,
            preMoneyValuation: metrics.preMoneyValuation,
            totalNewShares: metrics.totalNewShares,
            investmentAmount: metrics.investmentAmount,
            postMoneyValuation: metrics.postMoneyValuation,
            investments: metrics.updatedInvestments
        });
        setIsSelectingExisting(false);
    };

    const handleSharesInputChange = (invId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        handleFormattedNumberInput(e, (num) => {
            const newInvestments = round.investments.map(inv =>
                inv.id === invId ? { ...inv, shares: num } : inv
            );
            const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
            onUpdateRound({
                ...round,
                preMoneyValuation: metrics.preMoneyValuation,
                totalNewShares: metrics.totalNewShares,
                investmentAmount: metrics.investmentAmount,
                postMoneyValuation: metrics.postMoneyValuation,
                investments: metrics.updatedInvestments
            });
        });
    };

    const toggleSecondary = (invId: string) => {
        const newInvestments = round.investments.map(inv =>
            inv.id === invId ? {
                ...inv,
                isSecondary: !inv.isSecondary,
                sellerId: !inv.isSecondary ? undefined : inv.sellerId,
                shares: 0,
                amount: 0
            } : inv
        );
        const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
        onUpdateRound({
            ...round,
            preMoneyValuation: metrics.preMoneyValuation,
            totalNewShares: metrics.totalNewShares,
            investmentAmount: metrics.investmentAmount,
            postMoneyValuation: metrics.postMoneyValuation,
            investments: metrics.updatedInvestments
        });
    };

    const updateSeller = (invId: string, sellerId: string) => {
        const newInvestments = round.investments.map(inv =>
            inv.id === invId ? { ...inv, sellerId: sellerId || undefined } : inv
        );
        const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
        onUpdateRound({
            ...round,
            preMoneyValuation: metrics.preMoneyValuation,
            totalNewShares: metrics.totalNewShares,
            investmentAmount: metrics.investmentAmount,
            postMoneyValuation: metrics.postMoneyValuation,
            investments: metrics.updatedInvestments
        });
    };

    const removeInvestment = (invId: string) => {
        const newInvestments = round.investments.filter(i => i.id !== invId);
        const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
        onUpdateRound({
            ...round,
            preMoneyValuation: metrics.preMoneyValuation,
            totalNewShares: metrics.totalNewShares,
            investmentAmount: metrics.investmentAmount,
            postMoneyValuation: metrics.postMoneyValuation,
            investments: metrics.updatedInvestments
        });
    };

    // 구주 매매 거래 추가 함수
    const addSecondaryTransaction = (buyerId: string) => {
        const newInvestment: Investment = {
            id: crypto.randomUUID(),
            investorId: buyerId,
            amount: 0,
            shares: 0,
            isSecondary: true,
            sellerId: undefined,
            pricePerShare: round.sharePrice // 기본값: 라운드 주당 발행가격
        };
        const newInvestments = [...round.investments, newInvestment];
        const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
        onUpdateRound({
            ...round,
            preMoneyValuation: metrics.preMoneyValuation,
            totalNewShares: metrics.totalNewShares,
            investmentAmount: metrics.investmentAmount,
            postMoneyValuation: metrics.postMoneyValuation,
            investments: metrics.updatedInvestments
        });
    };

    // 구주 매매 주식수 변경 핸들러 (금액 자동 계산)
    const handleSecondarySharesChange = (invId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        handleFormattedNumberInput(e, (shares) => {
            const newInvestments = round.investments.map(inv => {
                if (inv.id === invId) {
                    const pricePerShare = inv.pricePerShare || round.sharePrice;
                    return { ...inv, shares, amount: shares * pricePerShare };
                }
                return inv;
            });
            const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
            onUpdateRound({
                ...round,
                preMoneyValuation: metrics.preMoneyValuation,
                totalNewShares: metrics.totalNewShares,
                investmentAmount: metrics.investmentAmount,
                postMoneyValuation: metrics.postMoneyValuation,
                investments: metrics.updatedInvestments
            });
        });
    };

    // 구주 매매 주당 가격 변경 핸들러 (금액 자동 계산)
    const handleSecondaryPricePerShareChange = (invId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        handleFormattedNumberInput(e, (pricePerShare) => {
            const newInvestments = round.investments.map(inv => {
                if (inv.id === invId) {
                    return { ...inv, pricePerShare, amount: inv.shares * pricePerShare };
                }
                return inv;
            });
            const metrics = calculateRoundMetrics(round.sharePrice, previousRoundShares, newInvestments);
            onUpdateRound({
                ...round,
                preMoneyValuation: metrics.preMoneyValuation,
                totalNewShares: metrics.totalNewShares,
                investmentAmount: metrics.investmentAmount,
                postMoneyValuation: metrics.postMoneyValuation,
                investments: metrics.updatedInvestments
            });
        });
    };

    // 신주 발행 투자 목록 (그룹화 불필요)
    const primaryInvestments = round.investments.filter(inv => !inv.isSecondary);

    // 구주 매매 투자들을 investorId로 그룹화
    const secondaryGroups = useMemo((): SecondaryGroup[] => {
        const groups: Map<string, Investment[]> = new Map();
        round.investments
            .filter(inv => inv.isSecondary)
            .forEach(inv => {
                const existing = groups.get(inv.investorId) || [];
                groups.set(inv.investorId, [...existing, inv]);
            });
        return Array.from(groups.entries()).map(([investorId, investments]) => ({
            investorId,
            investments
        }));
    }, [round.investments]);

    return (
        <div className="w-[360px] bg-slate-50 border-l border-slate-200 flex flex-col h-full flex-shrink-0">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/80 to-slate-50">
                <h2 className="font-bold text-lg">라운드 정보 입력</h2>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
                    <X className="h-5 w-5 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 라운드명 */}
                <div className="space-y-2">
                    <Label>라운드명</Label>
                    <Input
                        value={round.name}
                        onChange={(e) => onUpdateRound({ ...round, name: e.target.value })}
                        placeholder="예: 시리즈 A"
                    />
                </div>

                {/* 라운드 날짜 */}
                <div className="space-y-2">
                    <Label className="font-normal text-slate-500">라운드 시기</Label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"
                            value={round.date ? new Date(round.date).getFullYear() : ''}
                            onChange={(e) => {
                                const year = e.target.value;
                                const currentDate = round.date ? new Date(round.date) : new Date();
                                const month = currentDate.getMonth();
                                if (year) {
                                    onUpdateRound({ ...round, date: new Date(parseInt(year), month, 1).toISOString() });
                                }
                            }}
                        >
                            <option value="">연도</option>
                            {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                <option key={year} value={year}>{year}년</option>
                            ))}
                        </select>
                        <select
                            className="flex-1 h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"
                            value={round.date ? new Date(round.date).getMonth() : ''}
                            onChange={(e) => {
                                const month = e.target.value;
                                const currentDate = round.date ? new Date(round.date) : new Date();
                                const year = currentDate.getFullYear();
                                if (month !== '') {
                                    onUpdateRound({ ...round, date: new Date(year, parseInt(month), 1).toISOString() });
                                }
                            }}
                        >
                            <option value="">월</option>
                            {Array.from({ length: 12 }, (_, i) => i).map(month => (
                                <option key={month} value={month}>{month + 1}월</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 입력 모드 선택 */}
                <div className="space-y-3">
                    <Label>밸류에이션 입력 방식</Label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setInputMode('sharePrice')}
                            className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                                inputMode === 'sharePrice'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            주당 발행가격
                        </button>
                        <button
                            onClick={() => setInputMode('preMoney')}
                            className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                                inputMode === 'preMoney'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            프리머니
                        </button>
                    </div>
                </div>

                {/* 주당 발행가격 입력 */}
                {inputMode === 'sharePrice' && (
                    <div className="space-y-2">
                        <Label>주당 발행가격</Label>
                        <div className="relative">
                            <Input
                                className="pr-8"
                                value={sharePriceInput}
                                onChange={handleSharePriceInputChange}
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400 text-sm">원</span>
                        </div>
                    </div>
                )}

                {/* 프리머니 입력 */}
                {inputMode === 'preMoney' && (
                    <div className="space-y-2">
                        <Label>프리머니 밸류에이션</Label>
                        <div className="relative">
                            <Input
                                className="pr-8"
                                value={preMoneyInput}
                                onChange={handlePreMoneyInputChange}
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400 text-sm">원</span>
                        </div>
                        {previousRoundShares === 0 && (
                            <p className="text-xs text-amber-600">
                                기존 주식이 없어 주당 가격을 계산할 수 없습니다.
                            </p>
                        )}
                    </div>
                )}

                {/* 요약 정보 */}
                <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">기존 발행 주식</span>
                        <span>{fmt(previousRoundShares)}주</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">주당 발행가격</span>
                        <span>{fmt(round.sharePrice)}원</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">프리머니</span>
                        <span>{fmt(round.preMoneyValuation)}원</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-3">
                        <span className="text-slate-500">신규 발행 주식</span>
                        <span>{fmt(round.totalNewShares)}주</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">투자금</span>
                        <span>{fmt(round.investmentAmount)}원</span>
                    </div>
                    <div className="flex justify-between font-medium">
                        <span className="text-slate-700">포스트머니</span>
                        <span>{fmt(round.postMoneyValuation)}원</span>
                    </div>
                </div>

                {/* 투자자 목록 */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm">투자자</h3>

                    <div className="space-y-3">
                        {/* 신주 발행 투자 카드들 */}
                        {primaryInvestments.map(inv => {
                            const investor = allInvestors.find(i => i.id === inv.investorId);
                            return (
                                <div key={inv.id} className="border rounded-lg p-3 relative group border-slate-200">
                                    <button
                                        onClick={() => removeInvestment(inv.id)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500" />
                                    </button>

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-slate-400" />
                                            <span className="font-medium">{investor?.name || '알 수 없음'}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleSecondary(inv.id)}
                                            className="text-xs px-2 py-1 rounded-full transition-colors bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        >
                                            신주 발행
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Input
                                                className="h-8 pr-6 text-sm"
                                                value={inv.shares > 0 ? inv.shares.toLocaleString() : ''}
                                                onChange={(e) => handleSharesInputChange(inv.id, e)}
                                                placeholder="주식수"
                                            />
                                            <span className="absolute right-2 top-1.5 text-slate-400 text-xs">주</span>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                className="h-8 bg-slate-50 pr-6 text-sm"
                                                value={inv.amount > 0 ? inv.amount.toLocaleString() : '-'}
                                                disabled
                                                readOnly
                                            />
                                            <span className="absolute right-2 top-1.5 text-slate-400 text-xs">원</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 구주 매매 그룹화된 카드들 */}
                        {secondaryGroups.map(group => {
                            const investor = allInvestors.find(i => i.id === group.investorId);
                            return (
                                <div key={`secondary-${group.investorId}`} className="border rounded-lg p-3 relative group border-amber-200 bg-amber-50/30">
                                    {/* 그룹 전체 삭제 버튼 (모든 거래 삭제) */}
                                    <button
                                        onClick={() => {
                                            group.investments.forEach(inv => removeInvestment(inv.id));
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="모든 거래 삭제"
                                    >
                                        <X className="h-4 w-4 text-slate-300 hover:text-red-500" />
                                    </button>

                                    {/* 카드 헤더 */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-amber-500" />
                                            <span className="font-medium">{investor?.name || '알 수 없음'}</span>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                            구주 매매
                                        </span>
                                    </div>

                                    {/* 개별 거래 리스트 */}
                                    <div className="space-y-3">
                                        {group.investments.map((inv, idx) => {
                                            return (
                                                <div key={inv.id} className="bg-white rounded-lg p-3 border border-amber-100 relative">
                                                    {/* 개별 거래 삭제 버튼 */}
                                                    <button
                                                        onClick={() => removeInvestment(inv.id)}
                                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                                        title="이 거래 삭제"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>

                                                    {/* 거래 번호 */}
                                                    <div className="text-xs text-amber-600 font-medium mb-2">
                                                        거래 {idx + 1}
                                                    </div>

                                                    {/* 매도자 선택 */}
                                                    <div className="mb-3 flex items-center gap-2 text-sm">
                                                        <select
                                                            value={inv.sellerId || ''}
                                                            onChange={(e) => updateSeller(inv.id, e.target.value)}
                                                            className="flex-1 h-8 px-2 rounded border border-amber-200 bg-white text-sm"
                                                        >
                                                            <option value="">매도자 선택...</option>
                                                            {allInvestors
                                                                .filter(i => i.id !== inv.investorId)
                                                                .map(i => (
                                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                                ))
                                                            }
                                                        </select>
                                                        <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                        <span className="text-amber-700 font-medium truncate">{investor?.name}</span>
                                                    </div>

                                                    {/* 주식수, 주당 가격, 금액 (자동 계산) */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="relative">
                                                            <Input
                                                                className="h-8 pr-6 text-sm"
                                                                value={inv.shares > 0 ? inv.shares.toLocaleString() : ''}
                                                                onChange={(e) => handleSecondarySharesChange(inv.id, e)}
                                                                placeholder="주식수"
                                                            />
                                                            <span className="absolute right-2 top-1.5 text-slate-400 text-xs">주</span>
                                                        </div>
                                                        <div className="relative">
                                                            <Input
                                                                className="h-8 pr-6 text-sm"
                                                                value={(inv.pricePerShare ?? round.sharePrice) > 0 ? (inv.pricePerShare ?? round.sharePrice).toLocaleString() : ''}
                                                                onChange={(e) => handleSecondaryPricePerShareChange(inv.id, e)}
                                                                placeholder="주당가격"
                                                            />
                                                            <span className="absolute right-2 top-1.5 text-slate-400 text-xs">원</span>
                                                        </div>
                                                        <div className="relative">
                                                            <Input
                                                                className="h-8 pr-6 text-sm bg-slate-50"
                                                                value={inv.amount > 0 ? inv.amount.toLocaleString() : '-'}
                                                                disabled
                                                                readOnly
                                                            />
                                                            <span className="absolute right-2 top-1.5 text-slate-400 text-xs">원</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 거래 추가 버튼 */}
                                    <button
                                        onClick={() => addSecondaryTransaction(group.investorId)}
                                        className="mt-3 w-full py-2 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-100/50 rounded-lg border border-dashed border-amber-300 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Plus className="h-4 w-4" />
                                        거래 추가
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* 투자자 추가 버튼 */}
                    <div className="space-y-2">
                        {isAddingNew ? (
                            <div className="flex gap-2">
                                <Input
                                    autoFocus
                                    placeholder="투자자 이름"
                                    className="h-9"
                                    value={newInvestorName}
                                    onChange={(e) => setNewInvestorName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitNewInvestor();
                                        if (e.key === 'Escape') setIsAddingNew(false);
                                    }}
                                />
                                <Button size="sm" className="h-9" onClick={commitNewInvestor}>추가</Button>
                                <Button size="sm" variant="outline" className="h-9" onClick={() => setIsAddingNew(false)}>취소</Button>
                            </div>
                        ) : isSelectingExisting ? (
                            <div className="flex gap-2">
                                <select
                                    autoFocus
                                    className="flex-1 h-9 px-3 rounded border border-slate-200 bg-white"
                                    defaultValue=""
                                    onChange={(e) => selectExistingInvestor(e.target.value)}
                                >
                                    <option value="">투자자 선택...</option>
                                    {allInvestors
                                        .filter(inv => !primaryInvestments.some(i => i.investorId === inv.id))
                                        .map(inv => (
                                            <option key={inv.id} value={inv.id}>{inv.name}</option>
                                        ))
                                    }
                                </select>
                                <Button size="sm" variant="outline" className="h-9" onClick={() => setIsSelectingExisting(false)}>취소</Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => { setIsSelectingExisting(true); setIsAddingNew(false); }}
                                >
                                    기존 투자자 추가
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => { setIsAddingNew(true); setIsSelectingExisting(false); }}
                                >
                                    <Plus className="mr-1 h-4 w-4" /> 신규 투자자
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 하단 버튼 */}
            <div className="p-4 border-t border-slate-100">
                <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={onDeleteRound}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    이 라운드 삭제
                </Button>
            </div>
        </div>
    );
}
