'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPage() {
  const router = useRouter();
  // Next 13 app router dynamic params via useParams
  const params = useParams() as { token?: string } | null;
  const token = params?.token ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/auth/reset', {
        method: 'POST',
        body: { token, password },
      });
      setMessage(res?.message ?? 'Password reset. Redirecting to login...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm min-h-[430px]">
        <h1 className="mb-4 text-left text-3xl font-bold text-indigo-700">Reset password</h1>
        <p className="mb-6 text-left text-sm text-zinc-500">Enter a new password for your account.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">New password</label>
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirm password</label>
            <div className="relative">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type={showConfirm ? 'text' : 'password'} className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button type="submit" disabled={loading} className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Resetting...' : 'Reset password'}</button>
        </form>
      </div>
    </div>
  );
}
