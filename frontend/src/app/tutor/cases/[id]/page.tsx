'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { TuitionCase } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusBadge } from '@/components/StatusBadge';
import { DocumentList } from '@/components/DocumentList';
import { CheckCircle2, Lock, Send } from 'lucide-react';

const FREE_RESPONSE_LIMIT = 3;

export default function TutorCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [respondedCaseIds, setRespondedCaseIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('tutorRespondedCaseIds') ?? '[]');
  });
  const [isSubscribed, setIsSubscribed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tutorSubscriptionStatus') === 'active';
  });
  const [responseMessage, setResponseMessage] = useState('');

  const query = useQuery({
    queryKey: ['case', id],
    queryFn: () => apiFetch<{ case: TuitionCase }>(`/api/cases/${id}`, { token }),
  });

  if (query.isLoading) return <LoadingSpinner />;

  if (query.isError) {
    const err = query.error as ApiClientError;
    const msg = err.status === 404 ? 'Case not found or you have not been invited.' : err.message;
    return <ErrorAlert message={msg} onRetry={() => query.refetch()} />;
  }

  const tuitionCase = query.data!.case;
  const hasRespondedToThisCase = respondedCaseIds.includes(tuitionCase.id);
  const remainingResponses = Math.max(FREE_RESPONSE_LIMIT - respondedCaseIds.length, 0);
  const isPaywalled = !isSubscribed && !hasRespondedToThisCase && remainingResponses === 0;
  const responseStatus = isSubscribed
    ? 'Unlimited responses active'
    : hasRespondedToThisCase
      ? 'You already responded to this case'
      : `${remainingResponses} free ${remainingResponses === 1 ? 'response' : 'responses'} left`;

  const handleRespond = () => {
    if (isPaywalled || hasRespondedToThisCase) return;

    const nextCaseIds = [...respondedCaseIds, tuitionCase.id];
    setRespondedCaseIds(nextCaseIds);
    localStorage.setItem('tutorRespondedCaseIds', JSON.stringify(nextCaseIds));
    setResponseMessage('Your interest was sent to the parent.');
  };

  const handleSubscribe = () => {
    setIsSubscribed(true);
    localStorage.setItem('tutorSubscriptionStatus', 'active');
    setResponseMessage('Subscription activated. You can now respond to unlimited cases.');
  };

  return (
    <div>
      <Link href="/tutor/cases" className="text-sm text-indigo-600 hover:underline">← Back to cases</Link>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tuitionCase.title}</h1>
          <p className="mt-1 text-zinc-500">
            {tuitionCase.subject} · {tuitionCase.level} · ${tuitionCase.budgetPerHour}/hr
            {tuitionCase.location && ` · ${tuitionCase.location}`}
          </p>
          <p className="mt-1 text-sm text-zinc-400">Posted by {tuitionCase.owner?.name}</p>
        </div>
        <StatusBadge status={tuitionCase.status} />
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Respond to parent</h2>
            <p className="mt-1 text-sm text-zinc-500">{responseStatus}</p>
          </div>
          {isPaywalled ? (
            <button
              type="button"
              onClick={handleSubscribe}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Lock className="h-4 w-4" />
              Subscribe to respond
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRespond}
              disabled={hasRespondedToThisCase}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-zinc-300 disabled:text-zinc-600"
            >
              {hasRespondedToThisCase ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {hasRespondedToThisCase ? 'Response sent' : 'Send interest'}
            </button>
          )}
        </div>
        {isPaywalled && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Free tutors can respond to {FREE_RESPONSE_LIMIT} cases. Subscribe to keep replying to parents.
          </p>
        )}
        {responseMessage && <p className="mt-3 text-sm text-emerald-600">{responseMessage}</p>}
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Case Documents</h2>
        <p className="mt-1 text-sm text-zinc-500">Upload sample worksheets or materials for the parent.</p>
        <div className="mt-4">
          <DocumentList
            documents={tuitionCase.documents ?? []}
            canUpload
            uploadEndpoint={`cases/${id}/documents`}
            queryKey={['case', id]}
          />
        </div>
      </section>
    </div>
  );
}
