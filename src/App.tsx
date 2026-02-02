import { useState, useEffect, useRef } from 'react';
import type { Round, Investor, Simulation, Shareholding, InvestorGroup, Investment } from './types';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Plus, Trash2, Save, Check, Copy, Users, Pencil, Download, Upload, PanelLeftClose, PanelLeft, ChevronUp, ChevronDown, X, LayoutGrid, Layers, BarChart3, Share2, Loader2, Lock, LogOut } from 'lucide-react';
import { RoundEditor } from './components/RoundEditor';
import { RoundTable } from './components/RoundTable';
import { ChartPanel } from './components/ChartPanel';
import { calculateCapTable } from './lib/calc';

const STORAGE_KEY = 'investment-simulations';
const CURRENT_SIM_KEY = 'current-simulation-id';
const VIEW_MODE_KEY = 'investmentSimViewMode';
const AUTH_TOKEN_KEY = 'investmentSimAuthToken';

function createDefaultSimulation(name: string = '새 시뮬레이션'): Simulation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    rounds: [],
    investors: [{ id: 'inv-1', name: '창업자 A', type: 'FOUNDER' }],
    investorGroups: [],
    createdAt: now,
    updatedAt: now,
  };
}

function App() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [currentSimId, setCurrentSimId] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [isSimPanelOpen, setIsSimPanelOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | null>(null);
  const [isGroupPanelOpen, setIsGroupPanelOpen] = useState(false);
  const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);
  const [isCompactView, setIsCompactView] = useState(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved !== 'detailed';
  });
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL에 공유 링크가 있는지 확인
  const hasSharedId = new URLSearchParams(window.location.search).has('id');

  // 인증 토큰 검증
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifyToken();
  }, []);

  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsAuthenticated(false);
  };

  const currentSim = simulations.find(s => s.id === currentSimId) || null;
  const selectedRound = currentSim?.rounds.find(r => r.id === selectedRoundId) || null;
  const selectedRoundIndex = currentSim?.rounds.findIndex(r => r.id === selectedRoundId) ?? -1;

  // URL 파라미터에서 공유된 시뮬레이션 로드 또는 localStorage에서 로드
  useEffect(() => {
    const loadData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get('id');

      if (sharedId) {
        // 공유 링크로 접속한 경우 - 읽기 전용 모드
        setIsLoadingShared(true);
        setIsViewOnly(true);
        try {
          const response = await fetch(`/api/sim/${sharedId}`);
          if (response.ok) {
            const { simulation } = await response.json();
            // 공유된 시뮬레이션을 새 ID로 저장 (충돌 방지)
            const importedSim: Simulation = {
              ...simulation,
              id: crypto.randomUUID(),
              name: `${simulation.name} (공유됨)`,
            };
            setSimulations([importedSim]);
            setCurrentSimId(importedSim.id);
            // URL은 유지 (읽기 전용 모드 유지를 위해)
          } else {
            alert('공유된 시뮬레이션을 찾을 수 없습니다.');
            setIsViewOnly(false);
            loadFromLocalStorage();
          }
        } catch (error) {
          console.error('Failed to load shared simulation:', error);
          alert('공유된 시뮬레이션을 불러오는데 실패했습니다.');
          setIsViewOnly(false);
          loadFromLocalStorage();
        } finally {
          setIsLoadingShared(false);
        }
      } else {
        loadFromLocalStorage();
      }

      isInitialized.current = true;
    };

    const loadFromLocalStorage = () => {
      const savedSimulations = localStorage.getItem(STORAGE_KEY);
      const savedCurrentId = localStorage.getItem(CURRENT_SIM_KEY);

      if (savedSimulations) {
        const parsed = JSON.parse(savedSimulations) as Simulation[];
        setSimulations(parsed);

        if (savedCurrentId && parsed.some(s => s.id === savedCurrentId)) {
          setCurrentSimId(savedCurrentId);
        } else if (parsed.length > 0) {
          setCurrentSimId(parsed[0].id);
        }
      } else {
        const defaultSim = createDefaultSimulation('시뮬레이션 1');
        setSimulations([defaultSim]);
        setCurrentSimId(defaultSim.id);
      }
    };

    loadData();
  }, []);

  // 뷰 모드 저장
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, isCompactView ? 'compact' : 'detailed');
  }, [isCompactView]);

  // 자동 저장
  useEffect(() => {
    if (!isInitialized.current) return;

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulations));
      if (currentSimId) {
        localStorage.setItem(CURRENT_SIM_KEY, currentSimId);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [simulations, currentSimId]);

  const handleManualSave = () => {
    setSaveStatus('saving');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(simulations));
    if (currentSimId) {
      localStorage.setItem(CURRENT_SIM_KEY, currentSimId);
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  // 공유 링크 생성
  const handleShare = async () => {
    if (!currentSim) return;

    setIsSharing(true);
    setShareUrl(null);

    try {
      const response = await fetch('/api/sim/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulation: currentSim }),
      });

      if (response.ok) {
        const { id } = await response.json();
        const url = `${window.location.origin}?id=${id}`;
        setShareUrl(url);
        // 클립보드에 복사
        await navigator.clipboard.writeText(url);
      } else {
        alert('공유 링크 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
      alert('공유 링크 생성에 실패했습니다.');
    } finally {
      setIsSharing(false);
    }
  };

  // 데이터 내보내기
  const handleExport = () => {
    const data = {
      simulations,
      currentSimId,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investment-simulation-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 데이터 가져오기
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.simulations && Array.isArray(data.simulations)) {
            if (confirm(`${data.simulations.length}개의 시뮬레이션을 가져오시겠습니까?\n기존 데이터는 유지되고 새로운 시뮬레이션이 추가됩니다.`)) {
              // 기존 ID와 충돌 방지를 위해 새 ID 부여
              const importedSims = data.simulations.map((sim: Simulation) => ({
                ...sim,
                id: crypto.randomUUID(),
                name: `${sim.name} (가져옴)`,
                rounds: sim.rounds.map((r: Round) => ({
                  ...r,
                  id: crypto.randomUUID(),
                  investments: r.investments.map((inv: Investment) => ({
                    ...inv,
                    id: crypto.randomUUID()
                  }))
                }))
              }));
              setSimulations([...simulations, ...importedSims]);
              setCurrentSimId(importedSims[0]?.id || currentSimId);
            }
          } else {
            alert('올바른 형식의 파일이 아닙니다.');
          }
        } catch {
          alert('파일을 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const updateCurrentSim = (updates: Partial<Simulation>) => {
    if (!currentSimId) return;
    setSimulations(sims => sims.map(s =>
      s.id === currentSimId
        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
        : s
    ));
  };

  // 시뮬레이션 관리
  const createSimulation = () => {
    const newSim = createDefaultSimulation(`시뮬레이션 ${simulations.length + 1}`);
    setSimulations([...simulations, newSim]);
    setCurrentSimId(newSim.id);
    setSelectedRoundId(null);
  };

  const duplicateSimulation = (simId: string) => {
    const sourceSim = simulations.find(s => s.id === simId);
    if (!sourceSim) return;

    const now = new Date().toISOString();
    const newSim: Simulation = {
      ...structuredClone(sourceSim),
      id: crypto.randomUUID(),
      name: `${sourceSim.name} (복사본)`,
      createdAt: now,
      updatedAt: now,
      // 라운드와 투자에도 새 ID 부여
      rounds: sourceSim.rounds.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        investments: r.investments.map(inv => ({
          ...inv,
          id: crypto.randomUUID()
        }))
      }))
    };

    // 복사본을 원본 바로 다음에 삽입
    const sourceIndex = simulations.findIndex(s => s.id === simId);
    const newSims = [...simulations];
    newSims.splice(sourceIndex + 1, 0, newSim);
    setSimulations(newSims);
    setCurrentSimId(newSim.id);
    setSelectedRoundId(null);
  };

  const deleteSimulation = (simId: string) => {
    if (simulations.length <= 1) {
      alert('최소 하나의 시뮬레이션이 필요합니다.');
      return;
    }
    if (!confirm('이 시뮬레이션을 삭제하시겠습니까?')) return;

    const newSims = simulations.filter(s => s.id !== simId);
    setSimulations(newSims);

    if (currentSimId === simId) {
      setCurrentSimId(newSims[0]?.id || null);
      setSelectedRoundId(null);
    }
  };

  const selectSimulation = (simId: string) => {
    setCurrentSimId(simId);
    setSelectedRoundId(null);
  };

  const renameSimulation = (simId: string, newName: string) => {
    if (!newName.trim()) return;
    setSimulations(sims => sims.map(s =>
      s.id === simId
        ? { ...s, name: newName.trim(), updatedAt: new Date().toISOString() }
        : s
    ));
  };

  const moveSimulation = (simId: string, direction: 'up' | 'down') => {
    const index = simulations.findIndex(s => s.id === simId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === simulations.length - 1) return;

    const newSims = [...simulations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSims[index], newSims[targetIndex]] = [newSims[targetIndex], newSims[index]];
    setSimulations(newSims);
  };

  // 라운드 관리
  const addRound = () => {
    if (!currentSim) return;
    const newRound: Round = {
      id: crypto.randomUUID(),
      name: currentSim.rounds.length === 0 ? '창업' : `${currentSim.rounds.length + 1}차 투자`,
      date: new Date().toISOString(),
      preMoneyValuation: 0,
      postMoneyValuation: 0,
      sharePrice: 0,
      totalNewShares: 0,
      investmentAmount: 0,
      investments: []
    };
    updateCurrentSim({ rounds: [...currentSim.rounds, newRound] });
    setSelectedRoundId(newRound.id);
  };

  const onUpdateRound = (updatedRound: Round) => {
    if (!currentSim) return;
    updateCurrentSim({
      rounds: currentSim.rounds.map(r => r.id === updatedRound.id ? updatedRound : r)
    });
  };

  const onAddInvestor = (name: string, type: Investor['type']): Investor => {
    const newInv: Investor = { id: crypto.randomUUID(), name, type };
    if (currentSim) {
      updateCurrentSim({ investors: [...currentSim.investors, newInv] });
    }
    return newInv;
  };

  const onUpdateInvestor = (investorId: string, name: string) => {
    if (!currentSim) return;
    updateCurrentSim({
      investors: currentSim.investors.map(inv =>
        inv.id === investorId ? { ...inv, name } : inv
      )
    });
  };

  const onDeleteInvestor = (investorId: string) => {
    if (!currentSim) return;
    // 라운드에서 사용 중인지 확인
    const isUsed = currentSim.rounds.some(round =>
      round.investments.some(inv => inv.investorId === investorId || inv.sellerId === investorId)
    );
    if (isUsed) {
      alert('이 투자자는 라운드에서 사용 중이므로 삭제할 수 없습니다.');
      return;
    }
    if (!confirm('이 투자자를 삭제하시겠습니까?')) return;
    updateCurrentSim({
      investors: currentSim.investors.filter(inv => inv.id !== investorId)
    });
  };

  const onDeleteRound = () => {
    if (!currentSim || !selectedRoundId) return;
    if (!confirm('이 라운드를 삭제하시겠습니까?')) return;
    updateCurrentSim({ rounds: currentSim.rounds.filter(r => r.id !== selectedRoundId) });
    setSelectedRoundId(null);
  };

  // 그룹 관리
  const onAddGroup = (name: string): InvestorGroup => {
    const maxOrder = Math.max(0, ...(currentSim?.investorGroups || []).map(g => g.order || 0));
    const newGroup: InvestorGroup = { id: crypto.randomUUID(), name, order: maxOrder + 1 };
    if (currentSim) {
      updateCurrentSim({ investorGroups: [...(currentSim.investorGroups || []), newGroup] });
    }
    return newGroup;
  };

  const onUpdateGroup = (groupId: string, name: string) => {
    if (!currentSim) return;
    updateCurrentSim({
      investorGroups: (currentSim.investorGroups || []).map(g =>
        g.id === groupId ? { ...g, name } : g
      )
    });
  };

  const onDeleteGroup = (groupId: string) => {
    if (!currentSim) return;
    // 그룹 삭제 시 해당 그룹에 속한 투자자들의 groupId도 제거
    updateCurrentSim({
      investorGroups: (currentSim.investorGroups || []).filter(g => g.id !== groupId),
      investors: currentSim.investors.map(inv =>
        inv.groupId === groupId ? { ...inv, groupId: undefined } : inv
      )
    });
  };

  const onMoveGroup = (groupId: string, direction: 'up' | 'down') => {
    if (!currentSim) return;

    // 현재 order 기준 정렬 (order 없으면 맨 뒤로)
    const sortedGroups = [...(currentSim.investorGroups || [])].sort((a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity)
    );

    const currentIndex = sortedGroups.findIndex(g => g.id === groupId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedGroups.length) return;

    // 배열에서 위치 교환
    const newGroups = [...sortedGroups];
    [newGroups[currentIndex], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[currentIndex]];

    // 새 위치 기반으로 order 재할당
    updateCurrentSim({
      investorGroups: newGroups.map((g, idx) => ({ ...g, order: idx }))
    });
  };

  const onAssignInvestorToGroup = (investorId: string, groupId: string | undefined) => {
    if (!currentSim) return;
    updateCurrentSim({
      investors: currentSim.investors.map(inv =>
        inv.id === investorId ? { ...inv, groupId } : inv
      )
    });
  };

  // 특정 라운드까지의 캡테이블 계산
  const getCapTableAtRound = (roundIndex: number): Shareholding[] => {
    if (!currentSim) return [];
    if (roundIndex < 0) {
      // 초기 상태 - 첫 라운드 이전
      return [];
    }
    const roundsUpToIndex = currentSim.rounds.slice(0, roundIndex + 1);
    return calculateCapTable(roundsUpToIndex, currentSim.investors);
  };

  // 이전 라운드까지의 총 주식수
  const previousRoundShares = selectedRoundIndex > 0
    ? currentSim?.rounds.slice(0, selectedRoundIndex).reduce((sum, r) => sum + (r.totalNewShares || 0), 0) || 0
    : 0;

  const investors = currentSim?.investors || [];
  const rounds = currentSim?.rounds || [];
  const investorGroups = currentSim?.investorGroups || [];

  // 편집 가능 여부 (인증된 경우에만)
  const canEdit = isAuthenticated && !isViewOnly;

  // 그룹 지분 불완전 경고 계산 (모든 투자자가 그룹에 할당되지 않은 경우)
  const isGroupIncomplete = (() => {
    if (rounds.length === 0 || investorGroups.length === 0) return false;

    const lastCapTable = getCapTableAtRound(rounds.length - 1);
    const totalShares = lastCapTable.reduce((sum, h) => sum + h.shares, 0);
    if (totalShares === 0) return false;

    // 그룹에 속한 투자자 ID들
    const groupedInvestorIds = new Set(
      investors.filter(inv => inv.groupId).map(inv => inv.id)
    );

    // 그룹에 속한 투자자들의 주식 합계
    const groupedShares = lastCapTable
      .filter(h => groupedInvestorIds.has(h.investorId))
      .reduce((sum, h) => sum + h.shares, 0);

    const groupTotalPercentage = (groupedShares / totalShares) * 100;
    return Math.abs(groupTotalPercentage - 100) > 0.01;
  })();

  // 인증 확인 중
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  // 공유 링크 로딩 중
  if (isLoadingShared) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg">공유된 시뮬레이션을 불러오는 중...</p>
      </div>
    );
  }

  // 비로그인 + 공유 링크 없음 → 로그인 페이지 표시
  if (!isAuthenticated && !hasSharedId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            투자 시뮬레이터 <span className="text-base font-normal text-slate-400">by Huey</span>
          </h1>
          <p className="text-slate-400">관리자 로그인이 필요합니다</p>
        </div>
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* 상단 바 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 시뮬레이션 패널 토글 버튼 - 로그인 시에만 */}
            {!isViewOnly && (
              <>
                <button
                  onClick={() => setIsSimPanelOpen(!isSimPanelOpen)}
                  className={`p-2 rounded-lg transition-colors ${isSimPanelOpen ? 'bg-slate-700 text-blue-400' : 'hover:bg-slate-700/50 text-slate-400'}`}
                  title={isSimPanelOpen ? '시뮬레이션 목록 닫기' : '시뮬레이션 목록 열기'}
                >
                  {isSimPanelOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                </button>

                <div className="h-6 w-px bg-slate-700" />
              </>
            )}

            <h1 className="text-xl font-bold text-white">
              투자 시뮬레이터 <span className="text-xs font-normal text-slate-400">by Huey</span>
            </h1>

            {/* 현재 시뮬레이션 이름 표시 */}
            {currentSim && (
              <>
                <div className="h-6 w-px bg-slate-700" />
                <span className="text-slate-400 text-sm">{currentSim.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCompactView(!isCompactView)}
              className={`h-8 px-3 text-sm rounded-md flex items-center transition-colors ${
                isCompactView
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              {isCompactView ? <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> : <Layers className="h-3.5 w-3.5 mr-1.5" />}
              심플 뷰
            </button>

            {/* 투자자 관리 - 로그인 시에만 */}
            {!isViewOnly && (
              <button
                onClick={() => setIsGroupPanelOpen(!isGroupPanelOpen)}
                className={`h-8 px-3 text-sm rounded-md flex items-center transition-colors ${isGroupPanelOpen ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'}`}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                투자자 관리
                {isGroupIncomplete && (
                  <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            )}

            <button
              onClick={() => setIsChartPanelOpen(!isChartPanelOpen)}
              className={`h-8 px-3 text-sm rounded-md flex items-center transition-colors ${isChartPanelOpen ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'}`}
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              차트 분석
            </button>

            {/* 공유/내보내기/가져오기/저장 - 로그인 시에만 */}
            {!isViewOnly && (
              <>
                <div className="h-6 w-px bg-slate-700" />

                {/* 공유 링크 버튼 */}
                <div className="relative">
                  <button
                    onClick={handleShare}
                    disabled={isSharing || !currentSim}
                    className={`h-8 px-3 text-sm rounded-md flex items-center transition-colors ${
                      shareUrl
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'
                    } disabled:opacity-50`}
                  >
                    {isSharing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : shareUrl ? (
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {shareUrl ? '링크 복사됨!' : '공유 링크'}
                  </button>
                  {shareUrl && (
                    <div className="absolute top-full right-0 mt-2 p-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 min-w-[280px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200"
                        />
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(shareUrl);
                          }}
                          className="p-1.5 hover:bg-slate-700 rounded"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-300" />
                        </button>
                      </div>
                      <button
                        onClick={() => setShareUrl(null)}
                        className="mt-2 w-full text-xs text-slate-400 hover:text-slate-200"
                      >
                        닫기
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-slate-700" />

                <button onClick={handleExport} className="h-8 px-3 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md flex items-center transition-colors" title="JSON 파일로 내보내기">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  내보내기
                </button>
                <button onClick={handleImport} className="h-8 px-3 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md flex items-center transition-colors" title="JSON 파일 가져오기">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  가져오기
                </button>

                <div className="h-6 w-px bg-slate-700" />

                <button onClick={handleManualSave} className="h-8 px-3 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md flex items-center transition-colors">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  저장
                </button>

                <div className="flex items-center justify-end text-xs w-[70px]">
                  {saveStatus === 'saving' && <span className="text-blue-400">저장 중...</span>}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> 저장됨
                    </span>
                  )}
                  {!saveStatus && <span className="text-slate-500">자동 저장</span>}
                </div>

                <div className="h-6 w-px bg-slate-700" />

                {/* 로그아웃 버튼 */}
                <button
                  onClick={handleLogout}
                  className="h-8 px-3 text-sm text-emerald-400 hover:bg-slate-700/50 rounded-md flex items-center transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 읽기 전용 모드 알림 배너 */}
      {isViewOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between">
          <span className="text-sm text-amber-600">
            공유된 시뮬레이션을 보고 있습니다 (읽기 전용)
          </span>
          <button
            onClick={() => {
              setIsViewOnly(false);
              window.history.replaceState({}, '', window.location.pathname);
            }}
            className="text-sm text-amber-600 hover:text-amber-700 underline"
          >
            내 작업공간으로 이동
          </button>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 시뮬레이션 패널 - 로그인 시에만 */}
        {isSimPanelOpen && !isViewOnly && (
          <SimulationPanel
            simulations={simulations}
            currentSimId={currentSimId}
            canEdit={canEdit}
            onSelectSimulation={selectSimulation}
            onCreateSimulation={createSimulation}
            onDuplicateSimulation={duplicateSimulation}
            onDeleteSimulation={deleteSimulation}
            onRenameSimulation={renameSimulation}
            onMoveSimulation={moveSimulation}
            onClose={() => setIsSimPanelOpen(false)}
          />
        )}

        {/* 중앙: 라운드 테이블 */}
        <div className="flex-1 overflow-hidden bg-white">
          <RoundTable
            rounds={rounds}
            investors={investors}
            investorGroups={investorGroups}
            selectedRoundId={selectedRoundId}
            onSelectRound={(roundId) => {
              setSelectedRoundId(roundId);
              setIsGroupPanelOpen(false); // 라운드 선택 시 그룹 패널 닫기
            }}
            onAddRound={canEdit ? addRound : undefined}
            getCapTableAtRound={getCapTableAtRound}
            isCompactView={isCompactView}
          />
        </div>

        {/* 오른쪽: 라운드 에디터 또는 그룹 관리 패널 */}
        {selectedRound && !isGroupPanelOpen && canEdit && (
          <RoundEditor
            round={selectedRound}
            previousRoundShares={previousRoundShares}
            allInvestors={investors}
            onUpdateRound={onUpdateRound}
            onAddInvestor={onAddInvestor}
            onDeleteRound={onDeleteRound}
            onClose={() => setSelectedRoundId(null)}
          />
        )}

        {isGroupPanelOpen && !isViewOnly && (
          <InvestorPanel
            investors={investors}
            investorGroups={investorGroups}
            rounds={rounds}
            isGroupIncomplete={isGroupIncomplete}
            canEdit={canEdit}
            onAddInvestor={onAddInvestor}
            onUpdateInvestor={onUpdateInvestor}
            onDeleteInvestor={onDeleteInvestor}
            onAddGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onDeleteGroup={onDeleteGroup}
            onMoveGroup={onMoveGroup}
            onAssignInvestor={onAssignInvestorToGroup}
            onClose={() => setIsGroupPanelOpen(false)}
          />
        )}

        {isChartPanelOpen && (
          <ChartPanel
            rounds={rounds}
            investors={investors}
            investorGroups={investorGroups}
            getCapTableAtRound={getCapTableAtRound}
            onClose={() => setIsChartPanelOpen(false)}
          />
        )}
      </div>

          </div>
  );
}

// 로그인 페이지 컴포넌트 (전체 화면)
function LoginPage({
  onLogin
}: {
  onLogin: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError('');

    const success = await onLogin(password);
    if (!success) {
      setError('비밀번호가 올바르지 않습니다');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl w-[360px] overflow-hidden border border-white/10">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="space-y-2">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-blue-600 hover:bg-blue-500"
          disabled={isLoading || !password.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              로그인
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

// 시뮬레이션 관리 패널 컴포넌트
function SimulationPanel({
  simulations,
  currentSimId,
  canEdit,
  onSelectSimulation,
  onCreateSimulation,
  onDuplicateSimulation,
  onDeleteSimulation,
  onRenameSimulation,
  onMoveSimulation,
  onClose
}: {
  simulations: Simulation[];
  currentSimId: string | null;
  canEdit: boolean;
  onSelectSimulation: (simId: string) => void;
  onCreateSimulation: () => void;
  onDuplicateSimulation: (simId: string) => void;
  onDeleteSimulation: (simId: string) => void;
  onRenameSimulation: (simId: string, newName: string) => void;
  onMoveSimulation: (simId: string, direction: 'up' | 'down') => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="w-[280px] bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-100/80">
        <h2 className="font-bold text-lg">시뮬레이션</h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* 시뮬레이션 목록 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {simulations.map((sim, index) => {
            const isSelected = sim.id === currentSimId;
            const isEditing = editingId === sim.id;

            return (
              <div
                key={sim.id}
                className={`group rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer"
                  onClick={() => onSelectSimulation(sim.id)}
                >
                  {/* 드래그 핸들 / 순서 표시 */}
                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSimulation(sim.id, 'up');
                      }}
                      disabled={index === 0}
                      className={`p-0.5 rounded hover:bg-slate-200 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="위로 이동"
                    >
                      <ChevronUp className="h-2.5 w-2.5 text-slate-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSimulation(sim.id, 'down');
                      }}
                      disabled={index === simulations.length - 1}
                      className={`p-0.5 rounded hover:bg-slate-200 ${index === simulations.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="아래로 이동"
                    >
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </button>
                  </div>

                  {/* 이름 */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        autoFocus
                        defaultValue={sim.name}
                        className="h-7 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          onRenameSimulation(sim.id, e.target.value);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (!e.nativeEvent.isComposing && e.key === 'Enter') {
                            onRenameSimulation(sim.id, e.currentTarget.value);
                            setEditingId(null);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <>
                        <div className={`text-sm truncate ${isSelected ? 'font-medium text-blue-700' : ''}`}>
                          {sim.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sim.rounds.length}개 라운드 · {sim.investors.length}명 투자자
                        </div>
                      </>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  {!isEditing && canEdit && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(sim.id);
                        }}
                        className="p-1 hover:bg-slate-200 rounded"
                        title="이름 변경"
                      >
                        <Pencil className="h-3 w-3 text-slate-400 hover:text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateSimulation(sim.id);
                        }}
                        className="p-1 hover:bg-slate-200 rounded"
                        title="복사"
                      >
                        <Copy className="h-3 w-3 text-slate-400 hover:text-blue-500" />
                      </button>
                      {simulations.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSimulation(sim.id);
                          }}
                          className="p-1 hover:bg-slate-200 rounded"
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 새 시뮬레이션 버튼 */}
      {canEdit && (
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onCreateSimulation}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-300 transition-colors"
          >
            <Plus className="h-4 w-4" />
            새 시뮬레이션
          </button>
        </div>
      )}
    </div>
  );
}

// 투자자 관리 패널 컴포넌트
function InvestorPanel({
  investors,
  investorGroups,
  rounds,
  isGroupIncomplete,
  canEdit,
  onAddInvestor,
  onUpdateInvestor,
  onDeleteInvestor,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onMoveGroup,
  onAssignInvestor,
  onClose
}: {
  investors: Investor[];
  investorGroups: InvestorGroup[];
  rounds: Round[];
  isGroupIncomplete: boolean;
  canEdit: boolean;
  onAddInvestor: (name: string, type: Investor['type']) => Investor;
  onUpdateInvestor: (investorId: string, name: string) => void;
  onDeleteInvestor: (investorId: string) => void;
  onAddGroup: (name: string) => InvestorGroup;
  onUpdateGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
  onAssignInvestor: (investorId: string, groupId: string | undefined) => void;
  onClose: () => void;
}) {
  const [newInvestorName, setNewInvestorName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingInvestorId, setEditingInvestorId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // 투자자가 라운드에서 사용 중인지 확인
  const isInvestorUsed = (investorId: string) => {
    return rounds.some(round =>
      round.investments.some(inv => inv.investorId === investorId || inv.sellerId === investorId)
    );
  };

  const handleAddInvestor = () => {
    if (!newInvestorName.trim()) return;
    onAddInvestor(newInvestorName.trim(), 'INVESTOR');
    setNewInvestorName('');
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName('');
  };

  return (
    <div className="w-[380px] bg-slate-50 border-l border-slate-200 flex flex-col h-full flex-shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 to-slate-50">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg">투자자 관리</h2>
          {isGroupIncomplete && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 투자자 섹션 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">전체 투자자 ({investors.length}명)</span>
          </div>

          {/* 투자자 목록 */}
          <div className="space-y-1">
            {investors.map((inv, idx) => {
              const isEditing = editingInvestorId === inv.id;
              const isUsed = isInvestorUsed(inv.id);

              return (
                <div key={inv.id} className="flex items-center gap-2 py-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  {isEditing ? (
                    <Input
                      autoFocus
                      defaultValue={inv.name}
                      className="h-7 text-sm flex-1"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onUpdateInvestor(inv.id, e.target.value.trim());
                        }
                        setEditingInvestorId(null);
                      }}
                      onKeyDown={(e) => {
                        if (!e.nativeEvent.isComposing && e.key === 'Enter' && e.currentTarget.value.trim()) {
                          onUpdateInvestor(inv.id, e.currentTarget.value.trim());
                          setEditingInvestorId(null);
                        }
                        if (e.key === 'Escape') setEditingInvestorId(null);
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{inv.name}</div>
                      </div>
                      <select
                        className="h-6 px-1 text-xs border border-slate-200 rounded bg-white disabled:opacity-50"
                        value={inv.groupId || ''}
                        onChange={(e) => onAssignInvestor(inv.id, e.target.value || undefined)}
                        disabled={!canEdit}
                      >
                        <option value="">그룹 없음</option>
                        {[...investorGroups].sort((a, b) => (a.order || 0) - (b.order || 0)).map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => setEditingInvestorId(inv.id)}
                            className="p-1 rounded"
                            title="이름 변경"
                          >
                            <Pencil className="h-3 w-3 text-slate-400" />
                          </button>
                          {!isUsed && (
                            <button
                              onClick={() => {
                                if (confirm(`"${inv.name}" 투자자를 삭제하시겠습니까?`)) {
                                  onDeleteInvestor(inv.id);
                                }
                              }}
                              className="p-1 rounded"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3 text-slate-400" />
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 새 투자자 추가 */}
          {canEdit && (
            <div className="flex gap-2">
              <Input
                value={newInvestorName}
                onChange={(e) => setNewInvestorName(e.target.value)}
                placeholder="새 투자자 이름"
                className="h-8 text-sm"
                onKeyDown={(e) => !e.nativeEvent.isComposing && e.key === 'Enter' && handleAddInvestor()}
              />
              <Button size="sm" className="h-8 px-3" onClick={handleAddInvestor}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 그룹 섹션 */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">그룹 ({investorGroups.length}개)</span>
          </div>

          {/* 그룹 목록 */}
          <div className="space-y-2">
            {[...investorGroups].sort((a, b) => (a.order || 0) - (b.order || 0)).map((group, idx, sortedGroups) => {
              const groupInvestors = investors.filter(inv => inv.groupId === group.id);
              const isEditing = editingGroupId === group.id;
              const isFirst = idx === 0;
              const isLast = idx === sortedGroups.length - 1;

              return (
                <div key={group.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    {isEditing ? (
                      <Input
                        autoFocus
                        defaultValue={group.name}
                        className="h-7 text-sm flex-1"
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            onUpdateGroup(group.id, e.target.value.trim());
                          }
                          setEditingGroupId(null);
                        }}
                        onKeyDown={(e) => {
                          if (!e.nativeEvent.isComposing && e.key === 'Enter' && e.currentTarget.value.trim()) {
                            onUpdateGroup(group.id, e.currentTarget.value.trim());
                            setEditingGroupId(null);
                          }
                          if (e.key === 'Escape') setEditingGroupId(null);
                        }}
                      />
                    ) : (
                      <>
                        <span className="font-medium text-sm">{group.name}</span>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onMoveGroup(group.id, 'up')}
                              className={`p-1 rounded ${isFirst ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                              disabled={isFirst}
                              title="위로 이동"
                            >
                              <ChevronUp className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                              onClick={() => onMoveGroup(group.id, 'down')}
                              className={`p-1 rounded ${isLast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                              disabled={isLast}
                              title="아래로 이동"
                            >
                              <ChevronDown className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                              onClick={() => setEditingGroupId(group.id)}
                              className="p-1 hover:bg-slate-100 rounded"
                              title="이름 변경"
                            >
                              <Pencil className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`"${group.name}" 그룹을 삭제하시겠습니까?`)) {
                                  onDeleteGroup(group.id);
                                }
                              }}
                              className="p-1 hover:bg-slate-100 rounded"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {groupInvestors.length === 0 ? (
                    <p className="text-xs text-slate-400">소속 투자자 없음</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {groupInvestors.map(inv => (
                        <span key={inv.id} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {inv.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {investorGroups.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">
                아직 그룹이 없습니다
              </p>
            )}
          </div>

          {/* 새 그룹 추가 */}
          {canEdit && (
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="새 그룹 이름"
                className="h-8 text-sm"
                onKeyDown={(e) => !e.nativeEvent.isComposing && e.key === 'Enter' && handleAddGroup()}
              />
              <Button size="sm" className="h-8 px-3" onClick={handleAddGroup}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
