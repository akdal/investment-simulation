import { ChevronDown } from 'lucide-react';
import type { Simulation } from '../../types';

interface MobileSimSelectorProps {
  simulations: Simulation[];
  currentSimId: string | null;
  onSelectSimulation: (simId: string) => void;
}

export function MobileSimSelector({
  simulations,
  currentSimId,
  onSelectSimulation,
}: MobileSimSelectorProps) {
  const currentSim = simulations.find(s => s.id === currentSimId);

  if (simulations.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
      <div className="relative">
        <select
          value={currentSimId || ''}
          onChange={(e) => onSelectSimulation(e.target.value)}
          className="w-full h-10 pl-3 pr-10 text-sm font-medium bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {simulations.map((sim) => (
            <option key={sim.id} value={sim.id}>
              {sim.name} ({sim.rounds.length}개 라운드)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>

      {currentSim && (
        <div className="mt-2 text-xs text-slate-500">
          {currentSim.investors.length}명 투자자 ·{' '}
          {new Date(currentSim.updatedAt).toLocaleDateString('ko-KR')} 수정
        </div>
      )}
    </div>
  );
}
