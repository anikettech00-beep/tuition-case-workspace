'use client';

import { useAuth } from '@/providers/AuthProvider';
import { DownloadButton } from '@/components/DownloadButton';
import { DocumentMeta } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface DocumentListProps {
  documents: DocumentMeta[];
  caseId?: string;
  canUpload?: boolean;
  canDelete?: boolean;
  uploadEndpoint?: string;
  queryKey?: unknown[];
}

export function DocumentList({
  documents,
  canUpload,
  canDelete,
  uploadEndpoint,
  queryKey,
}: DocumentListProps) {
  const { token, user: currentUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiFetch(`/api/${uploadEndpoint}`, { method: 'POST', body: form, token });
    },
    onSuccess: () => {
      if (queryKey) queryClient.invalidateQueries({ queryKey });
      setUploadError('');
    },
    onError: (e: Error) => setUploadError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/documents/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      if (queryKey) queryClient.invalidateQueries({ queryKey });
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {canUpload && uploadEndpoint && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload document'}
          </button>
          <p className="mt-1 text-xs text-zinc-500">PDF, DOCX, PNG, JPG — max 10MB</p>
          {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-zinc-500">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {documents.map((doc) => {
            const uploaderName = doc.uploadedBy?.name ?? (doc.uploadedById ? (currentUser?.id === doc.uploadedById ? currentUser.name : doc.uploadedById) : 'Unknown');
            return (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{doc.originalFilename}</p>
                <p className="mt-1 text-xs text-zinc-500 truncate">{formatSize(doc.size)} · {uploaderName}</p>
                {uploaderName === 'Unknown' && (
                  <pre className="mt-1 text-xs text-zinc-400">{JSON.stringify({ uploadedBy: doc.uploadedBy, uploadedById: (doc as any).uploadedById }, null, 2)}</pre>
                )}
              </div>
               <div className="flex items-center gap-2 flex-shrink-0">
                 <DownloadButton documentId={doc.id} filename={doc.originalFilename} />
                 {canDelete && (
                   <button
                     onClick={() => deleteMutation.mutate(doc.id)}
                     className="rounded p-1.5 text-red-600 hover:bg-red-50"
                     title="Delete"
                   >
                     <Trash2 className="h-4 w-4" />
                   </button>
                 )}
               </div>
            </li>
          )})}
         </ul>
       )}
     </div>
   );
 }
