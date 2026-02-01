import { useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { X, TrendingUp, PieChart as PieChartIcon, Layers } from 'lucide-react';
import type { Round, Investor, Shareholding, InvestorGroup } from '../types';

interface ChartPanelProps {
    rounds: Round[];
    investors: Investor[];
    investorGroups: InvestorGroup[];
    getCapTableAtRound: (roundIndex: number) => Shareholding[];
    onClose: () => void;
}

type ChartTab = 'valuation' | 'ownership' | 'pie';

// 금액 포맷 (천단위 콤마)
const formatMoney = (value: number): string => {
    if (value >= 100_000_000) {
        const billions = value / 100_000_000;
        return `${billions % 1 === 0 ? billions.toLocaleString() : billions.toFixed(1)}억원`;
    } else if (value >= 10_000) {
        return `${Math.round(value / 10_000).toLocaleString()}만원`;
    }
    return `${value.toLocaleString()}원`;
};

const formatMoneyShort = (value: number): string => {
    if (value >= 100_000_000) {
        const billions = value / 100_000_000;
        return `${billions % 1 === 0 ? billions : billions.toFixed(1)}억`;
    } else if (value >= 10_000) {
        return `${Math.round(value / 10_000).toLocaleString()}만`;
    }
    return `${value.toLocaleString()}`;
};

// 차트 색상
const COLORS = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6',
];

export function ChartPanel({
    rounds,
    investors,
    investorGroups,
    getCapTableAtRound,
    onClose,
}: ChartPanelProps) {
    const [activeTab, setActiveTab] = useState<ChartTab>('valuation');
    const [ownershipViewMode, setOwnershipViewMode] = useState<'investor' | 'group'>('investor');
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

    // 밸류에이션 데이터
    const valuationData = useMemo(() => {
        return rounds.map((round, idx) => {
            const prevRound = idx > 0 ? rounds[idx - 1] : null;
            const prevPostMoney = prevRound?.postMoneyValuation || 0;
            const multiple = prevPostMoney > 0 && round.preMoneyValuation > 0
                ? round.preMoneyValuation / prevPostMoney
                : null;

            return {
                name: round.name,
                preMoney: round.preMoneyValuation,
                postMoney: round.postMoneyValuation,
                investment: round.investmentAmount,
                multiple: multiple ? `${multiple.toFixed(1)}x` : '',
            };
        });
    }, [rounds]);

    // 투자자별 지분율 데이터
    const ownershipByInvestorData = useMemo(() => {
        const allInvestorIds = new Set<string>();
        rounds.forEach(round => {
            round.investments.forEach(inv => {
                allInvestorIds.add(inv.investorId);
            });
        });

        return rounds.map((_, roundIdx) => {
            const capTable = getCapTableAtRound(roundIdx);
            const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);
            const round = rounds[roundIdx];

            const dataPoint: Record<string, string | number> = { name: round.name };

            allInvestorIds.forEach(investorId => {
                const investor = investors.find(i => i.id === investorId);
                const holding = capTable.find(h => h.investorId === investorId);
                const percentage = totalShares > 0 && holding
                    ? (holding.shares / totalShares) * 100
                    : 0;
                dataPoint[investor?.name || '알 수 없음'] = Math.round(percentage * 10) / 10;
            });

            return dataPoint;
        });
    }, [rounds, investors, getCapTableAtRound]);

    // 그룹별 지분율 데이터
    const ownershipByGroupData = useMemo(() => {
        if (investorGroups.length === 0) return [];

        return rounds.map((_, roundIdx) => {
            const capTable = getCapTableAtRound(roundIdx);
            const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);
            const round = rounds[roundIdx];

            const dataPoint: Record<string, string | number> = { name: round.name };

            investorGroups.forEach(group => {
                const groupInvestorIds = investors
                    .filter(inv => inv.groupId === group.id)
                    .map(inv => inv.id);

                const groupShares = capTable
                    .filter(h => groupInvestorIds.includes(h.investorId))
                    .reduce((sum, h) => sum + h.shares, 0);

                dataPoint[group.name] = totalShares > 0
                    ? Math.round((groupShares / totalShares) * 1000) / 10
                    : 0;
            });

            // 미분류
            const ungroupedIds = investors.filter(inv => !inv.groupId).map(inv => inv.id);
            const ungroupedShares = capTable
                .filter(h => ungroupedIds.includes(h.investorId))
                .reduce((sum, h) => sum + h.shares, 0);

            if (ungroupedShares > 0) {
                dataPoint['미분류'] = totalShares > 0
                    ? Math.round((ungroupedShares / totalShares) * 1000) / 10
                    : 0;
            }

            return dataPoint;
        });
    }, [rounds, investors, investorGroups, getCapTableAtRound]);

    // 파이 차트 데이터
    const pieChartData = useMemo(() => {
        if (rounds.length === 0) return [];

        const lastCapTable = getCapTableAtRound(rounds.length - 1);
        const totalShares = lastCapTable.reduce((sum, h) => sum + h.shares, 0);
        const lastRound = rounds[rounds.length - 1];

        return lastCapTable
            .map(holding => {
                const investor = investors.find(i => i.id === holding.investorId);
                const percentage = totalShares > 0 ? (holding.shares / totalShares) * 100 : 0;
                const value = lastRound.postMoneyValuation > 0 && totalShares > 0
                    ? (holding.shares / totalShares) * lastRound.postMoneyValuation
                    : 0;

                return {
                    name: investor?.name || '알 수 없음',
                    value: Math.round(percentage * 10) / 10,
                    shares: holding.shares,
                    marketValue: value,
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [rounds, investors, getCapTableAtRound]);

    // 카테고리 목록
    const ownershipCategories = useMemo(() => {
        if (ownershipViewMode === 'group' && investorGroups.length > 0) {
            const categories = investorGroups.map(g => g.name);
            if (ownershipByGroupData.some(d => d['미분류'])) {
                categories.push('미분류');
            }
            return categories;
        }

        const allInvestorIds = new Set<string>();
        rounds.forEach(round => {
            round.investments.forEach(inv => {
                allInvestorIds.add(inv.investorId);
            });
        });

        return Array.from(allInvestorIds)
            .map(id => investors.find(i => i.id === id)?.name || '알 수 없음');
    }, [ownershipViewMode, investorGroups, ownershipByGroupData, rounds, investors]);

    // 첫 라운드에서 지분을 가진 투자자들 (창업자로 간주)
    const founderIds = useMemo(() => {
        if (rounds.length === 0) return new Set<string>();
        const firstCapTable = getCapTableAtRound(0);
        return new Set(firstCapTable.filter(h => h.shares > 0).map(h => h.investorId));
    }, [rounds, getCapTableAtRound]);

    // 범례 토글
    const toggleCategory = (category: string) => {
        const newSelected = new Set(selectedCategories);
        if (newSelected.has(category)) {
            newSelected.delete(category);
        } else {
            newSelected.add(category);
        }
        setSelectedCategories(newSelected);
    };

    const clearSelection = () => {
        setSelectedCategories(new Set());
    };

    // 선택된 카테고리 기준 필터링된 데이터
    const filteredCategories = selectedCategories.size > 0
        ? ownershipCategories.filter(c => selectedCategories.has(c))
        : ownershipCategories;

    // 커스텀 툴팁
    const ValuationTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const data = payload[0]?.payload;

        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 shadow-xl">
                <p className="text-white font-semibold mb-2 flex items-center gap-2">
                    {label}
                    {data?.multiple && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            {data.multiple}
                        </span>
                    )}
                </p>
                <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        <span className="text-slate-400">프리머니:</span>
                        <span className="text-white font-medium">{formatMoney(data?.preMoney || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
                        <span className="text-slate-400">포스트머니:</span>
                        <span className="text-white font-medium">{formatMoney(data?.postMoney || 0)}</span>
                    </div>
                    {data?.investment > 0 && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                            <span className="text-slate-400">투자금:</span>
                            <span className="text-emerald-400 font-medium">{formatMoney(data.investment)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const OwnershipTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;

        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 shadow-xl max-w-xs">
                <p className="text-white font-semibold mb-2">{label}</p>
                <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                    {payload
                        .filter((p: any) => p.value > 0)
                        .sort((a: any, b: any) => b.value - a.value)
                        .map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: p.fill }}
                                    ></span>
                                    <span className="text-slate-300 truncate">{p.dataKey}</span>
                                </div>
                                <span className="text-white font-medium">{p.value}%</span>
                            </div>
                        ))}
                </div>
            </div>
        );
    };

    const PieTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const data = payload[0]?.payload;

        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 shadow-xl">
                <p className="text-white font-semibold mb-2">{data?.name}</p>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">지분율</span>
                        <span className="text-white font-medium">{data?.value}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">주식 수</span>
                        <span className="text-white font-medium">{data?.shares?.toLocaleString()}주</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">평가액</span>
                        <span className="text-emerald-400 font-medium">{formatMoney(data?.marketValue || 0)}</span>
                    </div>
                </div>
            </div>
        );
    };

    // 파이 차트 라벨 렌더러
    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null; // 5% 미만은 라벨 생략

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={500}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const tabs = [
        { id: 'valuation' as const, label: '밸류에이션', icon: TrendingUp },
        { id: 'ownership' as const, label: '지분 변화', icon: Layers },
        { id: 'pie' as const, label: '현재 지분', icon: PieChartIcon },
    ];

    if (rounds.length === 0) {
        return (
            <div className="w-[480px] bg-slate-900 border-l border-slate-700 flex flex-col h-full flex-shrink-0">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="font-bold text-lg text-white">차트 분석</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm px-8 text-center">
                    라운드를 추가하면 차트가 표시됩니다
                </div>
            </div>
        );
    }

    return (
        <div className="w-[480px] bg-slate-900 border-l border-slate-700 flex flex-col h-full flex-shrink-0">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="font-bold text-lg text-white">차트 분석</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                    <X className="h-5 w-5 text-slate-400" />
                </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-slate-700">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                            activeTab === tab.id
                                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 차트 */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'valuation' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">밸류에이션 추이</h3>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-1 bg-blue-500 rounded"></span>
                                    <span className="text-slate-400">프리머니</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-1 bg-violet-500 rounded"></span>
                                    <span className="text-slate-400">포스트머니</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50" style={{ outline: 'none' }}>
                            <ResponsiveContainer width="100%" height={280} style={{ outline: 'none' }}>
                                <AreaChart data={valuationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} accessibilityLayer={false}>
                                    <defs>
                                        <linearGradient id="preMoneyGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="postMoneyGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={formatMoneyShort}
                                        width={50}
                                    />
                                    <Tooltip content={<ValuationTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="preMoney"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="url(#preMoneyGrad)"
                                        dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                                        activeDot={false}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="postMoney"
                                        stroke="#8b5cf6"
                                        strokeWidth={2.5}
                                        fill="url(#postMoneyGrad)"
                                        dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 5 }}
                                        activeDot={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 라운드 카드 (1컬럼) */}
                        <div className="space-y-2">
                            {valuationData.map((data, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{data.name}</span>
                                            {data.multiple && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                                                    {data.multiple}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="text-right">
                                                <span className="text-slate-500 mr-2">포스트머니</span>
                                                <span className="text-slate-300 font-medium">{formatMoney(data.postMoney)}</span>
                                            </div>
                                            {data.investment > 0 && (
                                                <div className="text-right">
                                                    <span className="text-slate-500 mr-2">투자금</span>
                                                    <span className="text-emerald-400 font-medium">{formatMoney(data.investment)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'ownership' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">지분율 변화</h3>
                            {investorGroups.length > 0 && (
                                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                                    <button
                                        onClick={() => {
                                            setOwnershipViewMode('investor');
                                            setSelectedCategories(new Set());
                                        }}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                                            ownershipViewMode === 'investor'
                                                ? 'bg-slate-700 text-white'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        투자자별
                                    </button>
                                    <button
                                        onClick={() => {
                                            setOwnershipViewMode('group');
                                            setSelectedCategories(new Set());
                                        }}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                                            ownershipViewMode === 'group'
                                                ? 'bg-slate-700 text-white'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        그룹별
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50" style={{ outline: 'none' }}>
                            <ResponsiveContainer width="100%" height={300} style={{ outline: 'none' }}>
                                <BarChart
                                    key={`ownership-${ownershipViewMode}-${Array.from(selectedCategories).sort().join(',')}`}
                                    data={ownershipViewMode === 'group' && investorGroups.length > 0
                                        ? ownershipByGroupData
                                        : ownershipByInvestorData}
                                    margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                                    accessibilityLayer={false}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={(v) => `${v}%`}
                                        domain={[0, 100]}
                                        width={40}
                                    />
                                    <Tooltip content={<OwnershipTooltip />} />
                                    {(() => {
                                        const chartData = ownershipViewMode === 'group' && investorGroups.length > 0
                                            ? ownershipByGroupData
                                            : ownershipByInvestorData;
                                        const isFiltered = selectedCategories.size > 0;

                                        return filteredCategories.map((category, idx) => {
                                            const originalIdx = ownershipCategories.indexOf(category);
                                            const isLast = idx === filteredCategories.length - 1;

                                            return (
                                                <Bar
                                                    key={`${category}-${isLast ? 'last' : idx}`}
                                                    dataKey={category}
                                                    stackId="a"
                                                    fill={COLORS[originalIdx % COLORS.length]}
                                                    radius={0}
                                                    label={isLast && isFiltered ? (props: any) => {
                                                        const { x, y, width, index } = props;
                                                        const dataPoint = chartData[index];
                                                        if (!dataPoint) return null;
                                                        const total = filteredCategories.reduce(
                                                            (sum, cat) => sum + (Number(dataPoint[cat]) || 0), 0
                                                        );
                                                        if (total === 0) return null;
                                                        return (
                                                            <text
                                                                key={`label-${index}`}
                                                                x={x + width / 2}
                                                                y={y - 8}
                                                                fill="#ffffff"
                                                                fontSize={11}
                                                                fontWeight={600}
                                                                textAnchor="middle"
                                                            >
                                                                {total.toFixed(1)}%
                                                            </text>
                                                        );
                                                    } : undefined}
                                                />
                                            );
                                        });
                                    })()}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 클릭 가능한 범례 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">클릭하여 필터링</span>
                                {selectedCategories.size > 0 && (
                                    <button
                                        onClick={clearSelection}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        전체 보기
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {ownershipCategories.map((category, idx) => {
                                    const isSelected = selectedCategories.has(category);
                                    const isFiltered = selectedCategories.size > 0 && !isSelected;

                                    return (
                                        <button
                                            key={category}
                                            onClick={() => toggleCategory(category)}
                                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all border ${
                                                isSelected
                                                    ? 'bg-slate-700 border-slate-500 text-white'
                                                    : isFiltered
                                                        ? 'bg-slate-800/30 border-slate-700/50 text-slate-600'
                                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-sm flex-shrink-0 transition-opacity ${isFiltered ? 'opacity-30' : ''}`}
                                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                            ></span>
                                            <span className="truncate max-w-[100px]">{category}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 창업자(첫 라운드 주주) 희석 추이 */}
                        {rounds.length > 1 && founderIds.size > 0 && (
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <h4 className="text-xs font-medium text-slate-400 mb-3">
                                    초기 주주 희석 추이
                                    <span className="text-slate-600 ml-1">
                                        ({Array.from(founderIds).map(id => investors.find(i => i.id === id)?.name).filter(Boolean).join(', ')})
                                    </span>
                                </h4>
                                <div className="space-y-2.5">
                                    {rounds.map((round, idx) => {
                                        const capTable = getCapTableAtRound(idx);
                                        const totalShares = capTable.reduce((sum, h) => sum + h.shares, 0);

                                        const founderShares = capTable
                                            .filter(h => founderIds.has(h.investorId))
                                            .reduce((sum, h) => sum + h.shares, 0);

                                        const founderPercentage = totalShares > 0
                                            ? (founderShares / totalShares) * 100
                                            : 0;

                                        const prevCapTable = idx > 0 ? getCapTableAtRound(idx - 1) : null;
                                        const prevTotalShares = prevCapTable?.reduce((sum, h) => sum + h.shares, 0) || 0;
                                        const prevFounderShares = prevCapTable
                                            ?.filter(h => founderIds.has(h.investorId))
                                            .reduce((sum, h) => sum + h.shares, 0) || 0;
                                        const prevPercentage = prevTotalShares > 0
                                            ? (prevFounderShares / prevTotalShares) * 100
                                            : 0;

                                        const dilution = idx > 0 ? prevPercentage - founderPercentage : 0;

                                        return (
                                            <div key={round.id} className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-16 truncate">{round.name}</span>
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700"
                                                        style={{ width: `${founderPercentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-white font-medium w-12 text-right">
                                                    {founderPercentage.toFixed(1)}%
                                                </span>
                                                {dilution > 0.1 && (
                                                    <span className="text-xs text-red-400 w-12">
                                                        -{dilution.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pie' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white">현재 지분 구성</h3>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50" style={{ outline: 'none' }}>
                            <ResponsiveContainer width="100%" height={280} style={{ outline: 'none' }}>
                                <PieChart accessibilityLayer={false}>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={95}
                                        paddingAngle={2}
                                        dataKey="value"
                                        animationDuration={800}
                                        animationEasing="ease-out"
                                        label={renderPieLabel}
                                        labelLine={false}
                                    >
                                        {pieChartData.map((_, idx) => (
                                            <Cell
                                                key={`cell-${idx}`}
                                                fill={COLORS[idx % COLORS.length]}
                                                stroke="transparent"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 상세 목록 */}
                        <div className="space-y-2">
                            {pieChartData.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-medium truncate">{item.name}</div>
                                        <div className="text-xs text-slate-500">{item.shares.toLocaleString()}주</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-white font-semibold">{item.value}%</div>
                                        <div className="text-xs text-slate-500">{formatMoney(item.marketValue)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 총 기업가치 */}
                        <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-xl p-4 border border-blue-500/20">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">총 기업가치</span>
                                <span className="text-xl font-bold text-white">
                                    {formatMoney(rounds[rounds.length - 1].postMoneyValuation)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
