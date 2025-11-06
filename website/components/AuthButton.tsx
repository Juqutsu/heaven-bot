'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { LogIn, LogOut, User } from 'lucide-react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-10 w-24 bg-[#40444b] rounded animate-pulse" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center space-x-3">
        <Link
          href="/profile"
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-md hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Link>
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('discord')}
      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-md hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40"
    >
      <LogIn className="w-4 h-4" />
      <span>Sign In</span>
    </button>
  );
}
