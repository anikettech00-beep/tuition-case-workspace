'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { TutorProfile } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { DocumentList } from '@/components/DocumentList';
import { useState, useEffect } from 'react';

const schema = z.object({
  displayName: z.string().min(1),
  qualifications: z.string().optional(),
  experiences: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TutorProfilePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [saveMsg, setSaveMsg] = useState('');

  const query = useQuery({
    queryKey: ['tutor-profile'],
    queryFn: () => apiFetch<{ profile: TutorProfile | null }>('/api/tutors/me', { token }),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiFetch<{ profile: TutorProfile }>('/api/tutors/me', { method: 'PUT', body: data, token }),
    onSuccess: (res) => {
      queryClient.setQueryData(['tutor-profile'], { profile: res.profile });
      setSaveMsg('Profile saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    },
  });

  const profile = query.data?.profile;

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName,
        qualifications: profile.qualifications,
        experiences: profile.experiences,
      });
    }
  }, [profile, reset]);

  if (query.isLoading) return <LoadingSpinner />;
  if (query.isError) return <ErrorAlert message={(query.error as ApiClientError).message} />;

  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-zinc-900">My Tutor Profile</h1>
          <p className="mt-2 text-sm text-zinc-500">Parents can find you in the tutor directory.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="lg:col-span-2 mt-0 space-y-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Display Name</label>
              <input {...register('displayName')} className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-sm" placeholder="David Lim — Math Specialist" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Qualifications</label>
              <textarea {...register('qualifications')} rows={5} className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-sm" placeholder="BSc Mathematics, NUS, 2020" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Experience</label>
              <textarea {...register('experiences')} rows={5} className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-sm" placeholder="5 years teaching Sec 3-4 A-Math" />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button type="submit" disabled={isSubmitting} className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
              <div className="flex-1" />
              {saveMsg && <span className="text-sm text-emerald-600">{saveMsg}</span>}
              {saveMutation.isError && <span className="text-sm text-red-600">{(saveMutation.error as Error).message}</span>}
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Profile preview</h2>
              <div className="mt-4 text-sm text-zinc-700">
                <p className="font-medium">{profile?.displayName ?? '—'}</p>
                <p className="mt-3 text-zinc-500">{profile?.qualifications ?? 'No qualifications added'}</p>
                <p className="mt-2 text-zinc-500">{profile?.experiences ?? 'No experience added'}</p>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Supporting Documents</h2>
              <p className="mt-1 text-sm text-zinc-500">Upload degree certs, MOE letters, etc.</p>
              <div className="mt-4">
                <DocumentList
                  documents={profile?.documents ?? []}
                  canUpload
                  canDelete
                  uploadEndpoint="tutors/me/documents"
                  queryKey={['tutor-profile']}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
