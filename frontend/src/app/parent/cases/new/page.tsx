'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { ApiClientError } from '@/lib/api';
import { useState } from 'react';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  subject: z.string().min(1),
  level: z.string().min(1),
  location: z.string().optional(),
  budgetPerHour: z.number().positive('Must be positive'),
});

type FormData = z.infer<typeof schema>;

export default function NewCasePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subject: 'Math', level: 'P5' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch<{ case: { id: string } }>('/api/cases', { method: 'POST', body: data, token }),
    onSuccess: (res) => router.push(`/parent/cases/${res.case.id}`),
    onError: (e: Error) => setError(e instanceof ApiClientError ? e.message : 'Failed to create case'),
  });

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/parent/cases" className="text-sm text-indigo-600 hover:underline">← Back to cases</Link>
      <h1 className="mt-4 text-2xl font-bold">Create Tuition Case</h1>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input {...register('title')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="Weekly P5 Math tuition near Bishan" />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Subject</label>
            <input {...register('subject')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Level</label>
            <input {...register('level')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="P5" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location (optional)</label>
          <input {...register('location')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="Bishan" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Budget per hour</label>
          <input {...register('budgetPerHour', { valueAsNumber: true })} type="number" step="1" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          {errors.budgetPerHour && <p className="mt-1 text-xs text-red-600">{errors.budgetPerHour.message}</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create Case'}
        </button>
      </form>
    </div>
  );
}
