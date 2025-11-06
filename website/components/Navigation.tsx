'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, BarChart3, Palette, User, UserPlus, Users, Shield } from 'lucide-react';
import { AuthButton } from './AuthButton';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/stats', label: 'Statistics', icon: BarChart3 },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/compare', label: 'Compare', icon: Users },
    { href: '/friends', label: 'Friends', icon: UserPlus },
    { href: '/guilds', label: 'Guilds', icon: Shield },
    { href: '/designer', label: 'Designer', icon: Palette },
  ];

  return (
    <nav className="bg-[#2f3136] border-b border-[#202225] sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-white hover:text-[#5865F2] transition-colors flex items-center space-x-2">
              <span className="bg-gradient-to-r from-[#5865F2] to-[#4752C4] bg-clip-text text-transparent">Heaven Bot</span>
            </Link>
            <div className="hidden md:flex space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30'
                        : 'text-gray-300 hover:bg-[#40444b] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
