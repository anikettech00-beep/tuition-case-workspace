'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { DocumentList } from '@/components/DocumentList';
import { useAuth } from '@/providers/AuthProvider';
import { apiFetch, API_URL } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { DocumentMeta } from '@/lib/types';

const SERVER_PAGE_LIMIT = 50; // backend validation requires <= 50
const MAX_ITEMS = 500; // safety cap to avoid too many requests
const BATCH_SIZE = 8; // concurrent fetches when retrieving many details

async function fetchAllPages(resource: 'cases' | 'tutors', token: string | null) {
  const results: any[] = [];
  let page = 1;
  while (results.length < MAX_ITEMS) {
    const res = await apiFetch<any>(`/api/${resource}?limit=${SERVER_PAGE_LIMIT}&page=${page}`, { token });
    const list = res[resource] ?? [];
    results.push(...list);
    if (!res.pagination || list.length < SERVER_PAGE_LIMIT) break;
    page += 1;
  }
  return results.slice(0, MAX_ITEMS);
}

async function fetchCaseDocumentsForCases(caseIds: string[], token: string | null) {
  const docs: DocumentMeta[] = [];
  for (let i = 0; i < caseIds.length; i += BATCH_SIZE) {
    const batch = caseIds.slice(i, i + BATCH_SIZE);
    const batchRes = await Promise.all(batch.map(async (id) => {
      try {
        const r = await apiFetch<{ case: any }>(`/api/cases/${id}`, { token });
        return r.case?.documents ?? [];
      } catch (e) {
        return [] as any[];
      }
    }));
    batchRes.forEach((arr) => docs.push(...arr));
    if (docs.length >= MAX_ITEMS) break;
  }
  docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return docs.slice(0, MAX_ITEMS);
}

async function fetchTutorProfileDocumentsForUsers(userIds: string[], token: string | null) {
  const docs: DocumentMeta[] = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const batchRes = await Promise.all(batch.map(async (userId) => {
      try {
        const r = await apiFetch<{ profile: any }>(`/api/tutors/${userId}`, { token });
        return r.profile?.documents ?? [];
      } catch (e) {
        return [] as any[];
      }
    }));
    batchRes.forEach((arr) => docs.push(...arr));
    if (docs.length >= MAX_ITEMS) break;
  }
  docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return docs.slice(0, MAX_ITEMS);
}

export default function DocsPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const allDocsQuery = useQuery({
    queryKey: ['docs', 'all', token],
    queryFn: async () => {
      if (!token) return [] as DocumentMeta[];

      // fetch case ids visible to the user (paged)
      const cases = await fetchAllPages('cases', token);
      const caseIds = cases.map((c: any) => c.id).slice(0, MAX_ITEMS);

      // get documents from those cases (batched)
      const caseDocs = await fetchCaseDocumentsForCases(caseIds, token);

      // fetch tutor userIds (parents-only endpoint). If it 403s (e.g., tutor role), ignore.
      let tutorDocs: DocumentMeta[] = [];
      try {
        const tutors = await fetchAllPages('tutors', token);
        const userIds = tutors.map((t: any) => t.userId).slice(0, MAX_ITEMS);
        tutorDocs = await fetchTutorProfileDocumentsForUsers(userIds, token);
      } catch (e) {
        // no-op; some users (non-parents) won't be allowed to list tutors
        tutorDocs = [];
      }

      // merge & dedupe by id
      const map = new Map<string, DocumentMeta>();
      [...caseDocs, ...tutorDocs].forEach((d) => map.set(d.id, d));
      return Array.from(map.values()).slice(0, MAX_ITEMS);
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const myDocsQuery = useQuery({
    queryKey: ['docs', 'mine', token],
    queryFn: async () => {
      if (!token) return [] as DocumentMeta[];
      if (user?.role === 'TUTOR') {
        const res = await apiFetch<{ profile: any }>(`/api/tutors/me`, { token });
        return (res.profile?.documents ?? []) as DocumentMeta[];
      }
      // parent: fetch own cases then their docs
      const cases = await fetchAllPages('cases', token);
      const myCaseIds = cases.filter((c: any) => c.ownerId === user?.id).map((c: any) => c.id).slice(0, MAX_ITEMS);
      const docs = await fetchCaseDocumentsForCases(myCaseIds, token);
      return docs;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });

  const loading = allDocsQuery.isLoading || myDocsQuery.isLoading;
  const error = (allDocsQuery.isError && allDocsQuery.error) || (myDocsQuery.isError && myDocsQuery.error);

  const allDocs = allDocsQuery.data ?? [];
  const myDocs = myDocsQuery.data ?? [];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">Documents</h1>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setTab('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-zinc-200'}`}>
            All Docs
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'mine' ? 'bg-indigo-600 text-white' : 'bg-white border border-zinc-200'}`}>
            My Docs
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorAlert message={(error as Error).message} onRetry={() => { allDocsQuery.refetch(); myDocsQuery.refetch(); }} />
        ) : (
          <div>
            {tab === 'all' ? (
              <div>
                <p className="mb-6 text-sm text-zinc-600">Documents uploaded to cases and tutor profiles that you can access.</p>
                <DocumentList documents={allDocs} canUpload={false} canDelete={true} />
              </div>
            ) : (
              <div>
                <p className="mb-6 text-sm text-zinc-600">Your uploaded documents (case uploads for parents, profile uploads for tutors).</p>
                <DocumentList documents={myDocs} canUpload={false} canDelete={true} />
              </div>
            )}
          </div>
        )}

        {/* <section className="mt-8 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-800">
            API documentation: <a className="underline" href={API_URL ? `${API_URL}/api/docs` : 'http://localhost:4000/api/docs'} target="_blank" rel="noreferrer">Swagger UI</a>
          </p>
        </section> */}
      </main>
    </>
  );
}
