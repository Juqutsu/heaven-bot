'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Palette, Moon, Sun, Sparkles, Check } from 'lucide-react';

interface Theme {
  name: string;
  value: string;
  colors: {
    background: string;
    card: string;
    border: string;
    text: string;
    primary: string;
  };
}

const THEMES: Theme[] = [
  {
    name: 'Dark',
    value: 'dark',
    colors: {
      background: '#36393f',
      card: '#2f3136',
      border: '#40444b',
      text: '#ffffff',
      primary: '#5865F2',
    },
  },
  {
    name: 'Darker',
    value: 'darker',
    colors: {
      background: '#202225',
      card: '#2f3136',
      border: '#40444b',
      text: '#ffffff',
      primary: '#5865F2',
    },
  },
  {
    name: 'Light',
    value: 'light',
    colors: {
      background: '#f5f5f5',
      card: '#ffffff',
      border: '#e0e0e0',
      text: '#1a1a1a',
      primary: '#5865F2',
    },
  },
  {
    name: 'Blue',
    value: 'blue',
    colors: {
      background: '#1e3a5f',
      card: '#2a4a6f',
      border: '#3a5a7f',
      text: '#ffffff',
      primary: '#5865F2',
    },
  },
  {
    name: 'Purple',
    value: 'purple',
    colors: {
      background: '#2d1b3d',
      card: '#3d2b4d',
      border: '#4d3b5d',
      text: '#ffffff',
      primary: '#9b59b6',
    },
  },
  {
    name: 'Green',
    value: 'green',
    colors: {
      background: '#1a3a2a',
      card: '#2a4a3a',
      border: '#3a5a4a',
      text: '#ffffff',
      primary: '#57F287',
    },
  },
];

export function ThemeSelector() {
  const { data: session } = useSession();
  const [selectedTheme, setSelectedTheme] = useState<string>('dark');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      async function fetchTheme() {
        try {
          const response = await fetch(`/api/user/${session.user.id}/theme`);
          const result = await response.json();

          if (result.success && result.data) {
            setSelectedTheme(result.data.theme || 'dark');
          }
        } catch (error) {
          console.error('Error fetching theme:', error);
        }
      }

      fetchTheme();
    }
  }, [session]);

  const handleThemeChange = async (theme: string) => {
    if (!session?.user?.id) return;

    setSelectedTheme(theme);
    setSaving(true);

    try {
      const response = await fetch(`/api/user/${session.user.id}/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });

      const result = await response.json();

      if (result.success) {
        // Apply theme to document
        const themeData = THEMES.find(t => t.value === theme);
        if (themeData && typeof document !== 'undefined') {
          const root = document.documentElement;
          root.style.setProperty('--bg-primary', themeData.colors.background);
          root.style.setProperty('--bg-card', themeData.colors.card);
          root.style.setProperty('--border-color', themeData.colors.border);
          root.style.setProperty('--text-primary', themeData.colors.text);
          root.style.setProperty('--color-primary', themeData.colors.primary);
        }
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-4">
        <Palette className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">Profile Theme</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {THEMES.map((theme) => (
          <button
            key={theme.value}
            onClick={() => handleThemeChange(theme.value)}
            disabled={saving}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedTheme === theme.value
                ? 'border-[#5865F2] bg-[#5865F2]/10'
                : 'border-[#40444b] hover:border-[#5865F2]/50'
            }`}
            style={{
              backgroundColor: theme.colors.card,
              borderColor: selectedTheme === theme.value ? theme.colors.primary : theme.colors.border,
            }}
          >
            {selectedTheme === theme.value && (
              <div className="absolute top-2 right-2">
                <Check className="w-5 h-5 text-[#5865F2]" />
              </div>
            )}
            <div className="flex items-center space-x-2 mb-2">
              {theme.value === 'dark' || theme.value === 'darker' ? (
                <Moon className="w-4 h-4" style={{ color: theme.colors.text }} />
              ) : theme.value === 'light' ? (
                <Sun className="w-4 h-4" style={{ color: theme.colors.text }} />
              ) : (
                <Sparkles className="w-4 h-4" style={{ color: theme.colors.primary }} />
              )}
              <span className="font-medium" style={{ color: theme.colors.text }}>
                {theme.name}
              </span>
            </div>
            <div className="flex space-x-1">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: theme.colors.background }}
              />
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: theme.colors.card }}
              />
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: theme.colors.primary }}
              />
            </div>
          </button>
        ))}
      </div>

      {saving && (
        <p className="text-sm text-gray-400 mt-4">Saving theme...</p>
      )}
    </div>
  );
}

