'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Pagination, TuitionCase } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus } from 'lucide-react';
import { ApiClientError } from '@/lib/api';

const SUBJECTS = ['Math', 'English', 'Chinese', 'Physics', 'Chemistry', 'Biology'];
const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'JC1', 'JC2'];

export default function ParentCasesPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');

  const query = useQuery({
    queryKey: ['cases', { page, search, subject, level, status }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (subject) params.set('subject', subject);
      if (level) params.set('level', level);
      if (status) params.set('status', status);
      return apiFetch<{ cases: TuitionCase[]; pagination: Pagination }>(`/api/cases?${params}`, { token });
    },
  });

  if (query.isLoading) return <LoadingSpinner />;

  if (query.isError) {
    const err = query.error as ApiClientError;
    return <ErrorAlert message={err.message} onRetry={() => query.refetch()} />;
  }

  const { cases, pagination } = query.data!;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">My Tuition Cases</h1>
        <Link
          href="/parent/cases/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Case
        </Link>
      </div>

      <div className="mb-8 grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-4">
        <input
          placeholder="Search title..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 px-4 py-3 text-sm"
        />
        <select value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm">
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm">
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="MATCHED">Matched</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {cases.length === 0 ? (
        <EmptyState
          title="No cases found"
          description="Create your first tuition case to find a tutor."
          action={
            <Link href="/parent/cases/new" className="text-indigo-600 hover:underline">
              Create a case
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-6">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/parent/cases/${c.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg text-zinc-900">{c.title}</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      {c.subject} · {c.level} · ${c.budgetPerHour}/hr
                      {c.location && ` · ${c.location}`}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between text-sm text-zinc-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
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
