'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useState } from 'react';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const user = await login(data.email, data.password);
      router.push(user.role === 'PARENT' ? '/parent/cases' : '/tutor/cases');
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm min-h-[520px]">
        <div className="mb-6 flex items-center justify-center gap-2 text-indigo-700">
          <GraduationCap className="h-9 w-9" />
          <h1 className="text-3xl font-bold">TuitionCase</h1>
        </div>
        <h2 className="mb-6 text-center text-lg font-medium">Sign in</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="parent@demo.com"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
            </div>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="password123"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="mt-1 text-right">
            <Link href="/forgot" className="text-sm text-indigo-600 hover:underline">Forgot password?</Link>
          </div>
        </form>
        <p className="mt-3 text-left text-sm text-zinc-500">
          No account? <Link href="/register" className="text-indigo-600 hover:underline">Register</Link>
        </p>
        {/* <div className="mt-6 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
          <p className="font-medium">Demo accounts:</p>
          <p>Parent: parent@demo.com / password123</p>
          <p>Tutor: tutor@demo.com / password123</p>
        </div> */}
      </div>
    </div>
  );
}
