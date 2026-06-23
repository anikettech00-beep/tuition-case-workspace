'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { BookOpen, GraduationCap, LogOut, Users } from 'lucide-react';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const parentLinks = [
    { href: '/parent/cases', label: 'My Cases', icon: BookOpen },
    { href: '/parent/tutors', label: 'Find Tutors', icon: Users },
  ];

  const tutorLinks = [
    { href: '/tutor/cases', label: 'Invited Cases', icon: BookOpen },
    { href: '/tutor/profile', label: 'My Profile', icon: GraduationCap },
  ];

  const links = user.role === 'PARENT' ? parentLinks : tutorLinks;

  return (
    <header className="relative border-b border-zinc-200 bg-white">
      {/* Centered navigation */}
      <div className="mx-auto max-w-7xl px-6">
        <nav className="flex h-20 items-center justify-center">
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-md px-5 py-3 text-base font-medium transition-shadow ${
                    active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <Link href="/docs" className="rounded-md px-5 py-3 text-base text-zinc-600 hover:bg-zinc-50">
              Docs
            </Link>
          </div>
        </nav>
      </div>

      {/* Logo pinned to left edge */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20">
        <Link
          href={user.role === 'PARENT' ? '/parent/cases' : '/tutor/cases'}
          className="flex items-center gap-3 font-semibold text-indigo-700"
        >
          <GraduationCap className="h-7 w-7" />
          <span className="hidden sm:inline text-xl">TuitionCase</span>
        </Link>
      </div>

      {/* User block pinned to right edge */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <div className="flex items-center gap-4">
          <span className="text-base text-zinc-600">
            <span className="font-medium text-zinc-800">{user.name}</span>
            <span className="ml-2 inline-block rounded bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-600">
              {user.role}
            </span>
          </span>
          <button
            onClick={() => logout()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-base text-zinc-600 hover:bg-zinc-50"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
