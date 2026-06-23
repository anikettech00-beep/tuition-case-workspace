'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useState } from 'react';
import { ApiClientError } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['PARENT', 'TUTOR']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'PARENT' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const user = await registerUser(data);
      router.push(user.role === 'PARENT' ? '/parent/cases' : '/tutor/profile');
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm min-h-[520px]">
        <h1 className="mb-6 text-center text-3xl font-bold text-indigo-700">Create account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input {...register('name')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input {...register('email')} type="email" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password (min 8 chars)</label>
            <div className="relative">
              <input {...register('password')} type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">I am a</label>
            <select {...register('role')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="PARENT">Parent</option>
              <option value="TUTOR">Tutor</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {isSubmitting ? 'Creating...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-left text-sm text-zinc-500">
          Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
