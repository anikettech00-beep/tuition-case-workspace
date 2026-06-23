'use client';

import { useAuth } from '@/providers/AuthProvider';
import { API_URL } from '@/lib/api';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface DownloadButtonProps {
  documentId: string;
  filename: string;
}

/** Downloads a document with credentials / bearer token. */
export function DownloadButton({ documentId, filename }: DownloadButtonProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/documents/${documentId}/download`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download file. You may not have permission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
      title="Download"
    >
      <Download className="h-4 w-4" />
    </button>
  );
}
