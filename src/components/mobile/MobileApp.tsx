import { useState, useEffect, useRef } from 'react';
import type { Simulation, Shareholding } from '../../types';
import { calculateCapTable } from '../../lib/calc';
import { MobileHeader } from './MobileHeader';
import { MobileLogin } from './MobileLogin';
import { MobileSimSelector } from './MobileSimSelector';
import { MobileCapTable } from './MobileCapTable';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY = 'investment-simulations';
const CURRENT_SIM_KEY = 'current-simulation-id';
const AUTH_TOKEN_KEY = 'investmentSimAuthToken';

export function MobileApp() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [currentSimId, setCurrentSimId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const isInitialized = useRef(false);

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

  // 데이터 로드
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
            const importedSim: Simulation = {
              ...simulation,
              id: crypto.randomUUID(),
              name: `${simulation.name} (공유됨)`,
            };
            setSimulations([importedSim]);
            setCurrentSimId(importedSim.id);
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
      }
    };

    loadData();
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

  const handleSelectSimulation = (simId: string) => {
    setCurrentSimId(simId);
    localStorage.setItem(CURRENT_SIM_KEY, simId);
  };

  // 현재 시뮬레이션
  const currentSim = simulations.find(s => s.id === currentSimId) || null;
  const rounds = currentSim?.rounds || [];
  const investors = currentSim?.investors || [];

  // 특정 라운드까지의 캡테이블 계산
  const getCapTableAtRound = (roundIndex: number): Shareholding[] => {
    if (!currentSim) return [];
    if (roundIndex < 0) return [];
    const roundsUpToIndex = currentSim.rounds.slice(0, roundIndex + 1);
    return calculateCapTable(roundsUpToIndex, currentSim.investors);
  };

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
    return <MobileLogin onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <MobileHeader
        isAuthenticated={isAuthenticated}
        isViewOnly={isViewOnly}
        onLogout={handleLogout}
      />

      {/* 읽기 전용 모드 알림 배너 */}
      {isViewOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
          <p className="text-xs text-amber-600 text-center">
            공유된 시뮬레이션 (읽기 전용)
          </p>
        </div>
      )}

      {/* 시뮬레이션 선택 - 로그인 시에만 */}
      {isAuthenticated && !isViewOnly && (
        <MobileSimSelector
          simulations={simulations}
          currentSimId={currentSimId}
          onSelectSimulation={handleSelectSimulation}
        />
      )}

      {/* 캡테이블 표시 */}
      <MobileCapTable
        rounds={rounds}
        investors={investors}
        getCapTableAtRound={getCapTableAtRound}
      />
    </div>
  );
}
