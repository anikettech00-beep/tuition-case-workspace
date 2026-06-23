'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Pagination, TuitionCase } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusBadge } from '@/components/StatusBadge';

export default function TutorCasesPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['cases', 'tutor', { page, search }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      return apiFetch<{ cases: TuitionCase[]; pagination: Pagination }>(`/api/cases?${params}`, { token });
    },
  });

  if (query.isLoading) return <LoadingSpinner />;
  if (query.isError) return <ErrorAlert message={(query.error as ApiClientError).message} onRetry={() => query.refetch()} />;

  const { cases, pagination } = query.data!;

  return (
    <div>
      <h1 className="text-3xl font-bold">Invited Cases</h1>
      <p className="mt-1 text-zinc-500">Cases parents have invited you to view.</p>

      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="mt-6 w-full max-w-lg rounded-lg border border-zinc-300 px-3 py-3 text-sm"
      />

      {cases.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No invited cases" description="When a parent invites you to a case, it will appear here." />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4">
            {cases.map((c) => (
              <Link key={c.id} href={`/tutor/cases/${c.id}`} className="block rounded-2xl border border-zinc-200 bg-white p-6 hover:border-indigo-200 shadow-sm">
              <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{c.title}</h2>
                    <p className="mt-2 text-sm text-zinc-500">{c.subject} · {c.level} · ${c.budgetPerHour}/hr</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex justify-between text-sm text-zinc-500">
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
