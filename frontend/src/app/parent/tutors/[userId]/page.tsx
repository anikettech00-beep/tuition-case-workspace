'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { TutorProfile } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { DownloadButton } from '@/components/DownloadButton';
import { useState } from 'react';

export default function TutorProfileViewPage() {
  const { userId } = useParams<{ userId: string }>();
  const { token } = useAuth();
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ['tutor', userId],
    queryFn: () => apiFetch<{ profile: TutorProfile }>(`/api/tutors/${userId}`, { token }),
  });

  const copyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (query.isLoading) return <LoadingSpinner />;
  if (query.isError) return <ErrorAlert message={(query.error as ApiClientError).message} />;

  const profile = query.data!.profile;

  return (
    <div>
      <Link href="/parent/tutors" className="text-sm text-indigo-600 hover:underline">← Back to directory</Link>
      <h1 className="mt-4 text-2xl font-bold">{profile.displayName}</h1>
      <p className="mt-1 text-sm text-zinc-500">{profile.user?.email}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{profile.userId}</code>
        <button onClick={copyId} className="text-xs text-indigo-600 hover:underline">
          {copied ? 'Copied!' : 'Copy ID for invite'}
        </button>
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Qualifications</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{profile.qualifications || '—'}</pre>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Experience</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{profile.experiences || '—'}</pre>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Supporting Documents</h2>
        {(profile.documents ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No documents uploaded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {profile.documents!.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{doc.originalFilename}</span>
                <DownloadButton documentId={doc.id} filename={doc.originalFilename} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
