import { useState, useEffect, useRef } from 'react';
import type { Simulation, Shareholding } from '../../types';
import { calculateCapTable } from '../../lib/calc';
import { MobileHeader } from './MobileHeader';
import { MobileLogin } from './MobileLogin';
import { MobileSimSelector } from './MobileSimSelector';
import { MobileCapTable } from './MobileCapTable';
import { Loader2 } from 'lucide-react';

const AUTH_TOKEN_KEY = 'investmentSimAuthToken';

export function MobileApp() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [currentSimId, setCurrentSimId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // 데이터 로드 - 인증 후 또는 공유 링크
  useEffect(() => {
    if (isCheckingAuth) return; // 인증 확인 중이면 대기
    if (isInitialized.current) return;

    const loadData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get('id');

      if (sharedId) {
        // 공유 링크로 접속한 경우 - 읽기 전용 모드
        setIsLoading(true);
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
          }
        } catch (error) {
          console.error('Failed to load shared simulation:', error);
          alert('공유된 시뮬레이션을 불러오는데 실패했습니다.');
          setIsViewOnly(false);
        } finally {
          setIsLoading(false);
        }
      } else if (isAuthenticated) {
        // 로그인한 경우 - Redis에서 사용자 데이터 로드
        await loadFromRedis();
      }

      isInitialized.current = true;
    };

    loadData();
  }, [isCheckingAuth, isAuthenticated]);

  const loadFromRedis = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch('/api/user/simulations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.simulations && data.simulations.length > 0) {
          setSimulations(data.simulations);
          setCurrentSimId(data.currentSimId || data.simulations[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load simulations from Redis:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        // 로그인 후 데이터 로드
        isInitialized.current = false;
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
    setSimulations([]);
    setCurrentSimId(null);
    isInitialized.current = false;
  };

  const handleSelectSimulation = (simId: string) => {
    setCurrentSimId(simId);
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

  // 인증 확인 중 또는 데이터 로딩 중
  if (isCheckingAuth || isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg">{isCheckingAuth ? '로딩 중...' : '데이터를 불러오는 중...'}</p>
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
