'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { TuitionCase } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusBadge } from '@/components/StatusBadge';
import { DocumentList } from '@/components/DocumentList';
import { useState } from 'react';
import { UserX } from 'lucide-react';

export default function ParentCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [tutorId, setTutorId] = useState('');
  const [inviteError, setInviteError] = useState('');

  const query = useQuery({
    queryKey: ['case', id],
    queryFn: () => apiFetch<{ case: TuitionCase }>(`/api/cases/${id}`, { token }),
  });

  const inviteMutation = useMutation({
    mutationFn: (tid: string) =>
      apiFetch(`/api/cases/${id}/invitations`, { method: 'POST', body: { tutorId: tid }, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setTutorId('');
      setInviteError('');
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (tid: string) =>
      apiFetch(`/api/cases/${id}/invitations/${tid}`, { method: 'DELETE', token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case', id] }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/api/cases/${id}`, { method: 'PATCH', body: { status }, token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case', id] }),
  });

  if (query.isLoading) return <LoadingSpinner />;

  if (query.isError) {
    const err = query.error as ApiClientError;
    const msg = err.status === 404 ? 'Case not found or you do not have access.' : err.message;
    return <ErrorAlert message={msg} onRetry={() => query.refetch()} />;
  }

  const tuitionCase = query.data!.case;

  return (
    <div>
      <Link href="/parent/cases" className="text-sm text-indigo-600 hover:underline">← Back to cases</Link>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tuitionCase.title}</h1>
          <p className="mt-1 text-zinc-500">
            {tuitionCase.subject} · {tuitionCase.level} · ${tuitionCase.budgetPerHour}/hr
            {tuitionCase.location && ` · ${tuitionCase.location}`}
          </p>
        </div>
        <StatusBadge status={tuitionCase.status} />
      </div>

      <div className="mt-4 flex gap-2">
        {(['OPEN', 'MATCHED', 'CLOSED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => statusMutation.mutate(s)}
            disabled={tuitionCase.status === s}
            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:bg-indigo-50 disabled:text-indigo-700"
          >
            Mark {s.toLowerCase()}
          </button>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="mt-4">
          <DocumentList
            documents={tuitionCase.documents ?? []}
            canUpload
            canDelete
            uploadEndpoint={`cases/${id}/documents`}
            queryKey={['case', id]}
          />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Invited Tutors</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Invite a tutor by their user ID (find tutors in the <Link href="/parent/tutors" className="text-indigo-600 hover:underline">directory</Link>).
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={tutorId}
            onChange={(e) => setTutorId(e.target.value)}
            placeholder="Tutor user ID (UUID)"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => inviteMutation.mutate(tutorId)}
            disabled={!tutorId || inviteMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Invite
          </button>
        </div>
        {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
        <ul className="mt-4 divide-y divide-zinc-100">
          {(tuitionCase.invitations ?? []).map((inv) => (
            <li key={inv.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{inv.tutor?.name}</p>
                <p className="text-xs text-zinc-500">{inv.tutor?.email}</p>
              </div>
              <button
                onClick={() => revokeMutation.mutate(inv.tutorId)}
                className="flex items-center gap-1 text-sm text-red-600 hover:underline"
              >
                <UserX className="h-4 w-4" /> Revoke
              </button>
            </li>
          ))}
          {(tuitionCase.invitations ?? []).length === 0 && (
            <li className="py-3 text-sm text-zinc-500">No tutors invited yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
