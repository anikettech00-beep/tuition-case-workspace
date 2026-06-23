'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Pagination, TutorProfile } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function TutorDirectoryPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['tutors', { page, search }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      return apiFetch<{ tutors: TutorProfile[]; pagination: Pagination }>(`/api/tutors?${params}`, { token });
    },
  });

  if (query.isLoading) return <LoadingSpinner />;
  if (query.isError) return <ErrorAlert message={(query.error as ApiClientError).message} onRetry={() => query.refetch()} />;

  const { tutors, pagination } = query.data!;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-extrabold">Find a Tutor</h1>
      <p className="mt-2 text-zinc-500">Browse tutor profiles and invite them to your cases.</p>

      <input
        placeholder="Search by name, qualifications, experience..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="mt-6 w-full max-w-2xl rounded-lg border border-zinc-300 px-4 py-3 text-sm"
      />

      {tutors.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No tutors found" description="Try a different search term." />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.map((t) => (
              <Link
                key={t.id}
                href={`/parent/tutors/${t.userId}`}
                className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
              >
                <h2 className="font-semibold text-zinc-900 text-lg">{t.displayName}</h2>
                <p className="mt-3 line-clamp-3 text-sm text-zinc-500">{t.qualifications || 'No qualifications listed'}</p>
                <p className="mt-3 text-xs text-zinc-400">{t._count?.documents ?? 0} supporting documents</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between text-sm text-zinc-500 max-w-4xl">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
              <button disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
