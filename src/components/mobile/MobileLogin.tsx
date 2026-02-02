import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Lock, Loader2 } from 'lucide-react';

interface MobileLoginProps {
  onLogin: (password: string) => Promise<boolean>;
}

export function MobileLogin({ onLogin }: MobileLoginProps) {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          투자 시뮬레이터
        </h1>
        <p className="text-sm text-slate-400">by Huey</p>
      </div>

      <div className="w-full max-w-[320px] bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

      <p className="mt-6 text-sm text-slate-500 text-center">
        모바일에서는 보기 전용입니다
      </p>
    </div>
  );
}
