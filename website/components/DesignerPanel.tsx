'use client';

import { useState } from 'react';
import { Move, Maximize2, Palette, Eye, Sparkles, Settings } from 'lucide-react';
import { PositionControl } from './PositionControl';
import { SizeControl } from './SizeControl';
import { ColorPicker } from './ColorPicker';
import { VisibilityToggle } from './VisibilityToggle';
import { LayoutPresets } from './LayoutPresets';
import { EffectControls } from './EffectControls';
import { RankCardSettings } from '@/lib/rankCardDefaults';

interface DesignerPanelProps {
  settings: RankCardSettings;
  onChange: (updates: Partial<RankCardSettings>) => void;
  onReset: () => void;
}

type Tab = 'position' | 'size' | 'colors' | 'visibility' | 'effects' | 'presets';

export function DesignerPanel({ settings, onChange, onReset }: DesignerPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('position');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['avatar', 'username']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const tabs = [
    { id: 'position' as Tab, label: 'Position', icon: Move },
    { id: 'size' as Tab, label: 'Size', icon: Maximize2 },
    { id: 'colors' as Tab, label: 'Colors', icon: Palette },
    { id: 'visibility' as Tab, label: 'Visibility', icon: Eye },
    { id: 'effects' as Tab, label: 'Effects', icon: Sparkles },
    { id: 'presets' as Tab, label: 'Presets', icon: Settings },
  ];

  return (
    <div className="bg-[#2f3136] rounded-lg border border-[#40444b] shadow-lg shadow-black/20">
      {/* Tabs */}
      <div className="flex border-b border-[#40444b] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-[#5865F2] bg-[#36393f]'
                  : 'text-gray-400 hover:text-white hover:bg-[#36393f]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {activeTab === 'position' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Element Positions</h3>
            
            {settings.showAvatar && (
              <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
                <button
                  onClick={() => toggleSection('avatar')}
                  className="w-full flex items-center justify-between text-white font-medium mb-3"
                >
                  <span>Avatar</span>
                  <span>{expandedSections.has('avatar') ? '−' : '+'}</span>
                </button>
                {expandedSections.has('avatar') && (
                  <PositionControl
                    label="Avatar Position"
                    x={settings.avatar.x}
                    y={settings.avatar.y}
                    maxX={1000}
                    maxY={280}
                    onChange={(x, y) => onChange({ avatar: { x, y } })}
                  />
                )}
              </div>
            )}

            {settings.showUsername && (
              <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
                <button
                  onClick={() => toggleSection('username')}
                  className="w-full flex items-center justify-between text-white font-medium mb-3"
                >
                  <span>Username</span>
                  <span>{expandedSections.has('username') ? '−' : '+'}</span>
                </button>
                {expandedSections.has('username') && (
                  <PositionControl
                    label="Username Position"
                    x={settings.username.x}
                    y={settings.username.y}
                    maxX={1000}
                    maxY={280}
                    onChange={(x, y) => onChange({ username: { x, y } })}
                  />
                )}
              </div>
            )}

            {settings.showPrestige && (
              <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
                <button
                  onClick={() => toggleSection('prestige')}
                  className="w-full flex items-center justify-between text-white font-medium mb-3"
                >
                  <span>Prestige Badge</span>
                  <span>{expandedSections.has('prestige') ? '−' : '+'}</span>
                </button>
                {expandedSections.has('prestige') && (
                  <PositionControl
                    label="Prestige Position"
                    x={settings.prestige.x}
                    y={settings.prestige.y}
                    maxX={1000}
                    maxY={280}
                    onChange={(x, y) => onChange({ prestige: { x, y } })}
                  />
                )}
              </div>
            )}

            {settings.showLevel && (
              <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
                <button
                  onClick={() => toggleSection('level')}
                  className="w-full flex items-center justify-between text-white font-medium mb-3"
                >
                  <span>Level Indicator</span>
                  <span>{expandedSections.has('level') ? '−' : '+'}</span>
                </button>
                {expandedSections.has('level') && (
                  <PositionControl
                    label="Level Position"
                    x={settings.level.x}
                    y={settings.level.y}
                    maxX={1000}
                    maxY={280}
                    onChange={(x, y) => onChange({ level: { x, y } })}
                  />
                )}
              </div>
            )}

            {settings.showXpInfo && (
              <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
                <button
                  onClick={() => toggleSection('xp')}
                  className="w-full flex items-center justify-between text-white font-medium mb-3"
                >
                  <span>XP Info</span>
                  <span>{expandedSections.has('xp') ? '−' : '+'}</span>
                </button>
                {expandedSections.has('xp') && (
                  <PositionControl
                    label="XP Info Position"
                    x={settings.xpInfo.x}
                    y={settings.xpInfo.y}
                    maxX={1000}
                    maxY={280}
                    onChange={(x, y) => onChange({ xpInfo: { x, y } })}
                  />
                )}
              </div>
            )}

            {settings.showProgressBar && (
              <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
                <button
                  onClick={() => toggleSection('progress')}
                  className="w-full flex items-center justify-between text-white font-medium mb-3"
                >
                  <span>Progress Bar</span>
                  <span>{expandedSections.has('progress') ? '−' : '+'}</span>
                </button>
                {expandedSections.has('progress') && (
                  <PositionControl
                    label="Progress Bar Position"
                    x={settings.progressBar.x}
                    y={settings.progressBar.y}
                    maxX={1000}
                    maxY={280}
                    onChange={(x, y) => onChange({ progressBar: { x, y } })}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'size' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Element Sizes</h3>
            
            {settings.showAvatar && (
              <SizeControl
                label="Avatar Size"
                value={settings.avatarSize}
                min={50}
                max={300}
                onChange={(value) => onChange({ avatarSize: value })}
              />
            )}

            {settings.showUsername && (
              <SizeControl
                label="Username Font Size"
                value={settings.usernameFontSize}
                min={20}
                max={60}
                onChange={(value) => onChange({ usernameFontSize: value })}
              />
            )}

            {settings.showPrestige && (
              <SizeControl
                label="Prestige Font Size"
                value={settings.prestigeFontSize}
                min={12}
                max={30}
                onChange={(value) => onChange({ prestigeFontSize: value })}
              />
            )}

            {settings.showLevel && (
              <>
                <SizeControl
                  label="Level Font Size"
                  value={settings.levelFontSize}
                  min={20}
                  max={50}
                  onChange={(value) => onChange({ levelFontSize: value })}
                />
                <SizeControl
                  label="Level Label Font Size"
                  value={settings.levelLabelFontSize}
                  min={10}
                  max={20}
                  onChange={(value) => onChange({ levelLabelFontSize: value })}
                />
              </>
            )}

            {settings.showXpInfo && (
              <SizeControl
                label="XP Font Size"
                value={settings.xpFontSize}
                min={14}
                max={30}
                onChange={(value) => onChange({ xpFontSize: value })}
              />
            )}

            {settings.showProgressBar && (
              <>
                <SizeControl
                  label="Progress Bar Width"
                  value={settings.progressBarWidth}
                  min={100}
                  max={800}
                  onChange={(value) => onChange({ progressBarWidth: value })}
                />
                <SizeControl
                  label="Progress Bar Height"
                  value={settings.progressBarHeight}
                  min={10}
                  max={40}
                  onChange={(value) => onChange({ progressBarHeight: value })}
                />
                <SizeControl
                  label="Progress Text Font Size"
                  value={settings.progressBarTextFontSize}
                  min={12}
                  max={24}
                  onChange={(value) => onChange({ progressBarTextFontSize: value })}
                />
              </>
            )}

            <SizeControl
              label="Avatar Border Width"
              value={settings.avatarBorderWidth}
              min={0}
              max={10}
              onChange={(value) => onChange({ avatarBorderWidth: value })}
            />
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Colors</h3>
            
            {/* Text Alignment Controls */}
            <div className="p-4 bg-[#40444b] rounded-lg border border-[#36393f] space-y-3">
              <h4 className="font-medium text-white mb-3">Text Alignment</h4>
              
              {settings.showUsername && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Username Alignment</label>
                  <select
                    value={settings.usernameAlign}
                    onChange={(e) => onChange({ usernameAlign: e.target.value as 'left' | 'center' | 'right' })}
                    className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}

              {settings.showPrestige && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Prestige Alignment</label>
                  <select
                    value={settings.prestigeAlign}
                    onChange={(e) => onChange({ prestigeAlign: e.target.value as 'left' | 'center' | 'right' })}
                    className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}

              {settings.showLevel && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Level Alignment</label>
                  <select
                    value={settings.levelAlign}
                    onChange={(e) => onChange({ levelAlign: e.target.value as 'left' | 'center' | 'right' })}
                    className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}

              {settings.showXpInfo && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">XP Text Alignment</label>
                  <select
                    value={settings.xpAlign}
                    onChange={(e) => onChange({ xpAlign: e.target.value as 'left' | 'center' | 'right' })}
                    className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}

              {settings.showProgressText && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Progress Text Alignment</label>
                  <select
                    value={settings.progressTextAlign}
                    onChange={(e) => onChange({ progressTextAlign: e.target.value as 'left' | 'center' | 'right' })}
                    className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}
            </div>
            
            <ColorPicker
              label="Primary Color"
              value={settings.primaryColor}
              onChange={(color) => onChange({ primaryColor: color || '#5865F2' })}
              defaultColor="#5865F2"
            />

            <ColorPicker
              label="Background Color"
              value={settings.backgroundColor}
              onChange={(color) => onChange({ backgroundColor: color || '#1F2937' })}
              defaultColor="#1F2937"
            />

            {settings.showUsername && (
              <ColorPicker
                label="Username Color"
                value={settings.usernameColor}
                onChange={(color) => onChange({ usernameColor: color || '#FFFFFF' })}
                defaultColor="#FFFFFF"
              />
            )}

            {settings.showPrestige && (
              <ColorPicker
                label="Prestige Color"
                value={settings.prestigeColor}
                onChange={(color) => onChange({ prestigeColor: color || '#5865F2' })}
                defaultColor="#5865F2"
              />
            )}

            {settings.showLevel && (
              <ColorPicker
                label="Level Color"
                value={settings.levelColor}
                onChange={(color) => onChange({ levelColor: color || '#FFFFFF' })}
                defaultColor="#FFFFFF"
              />
            )}

            {settings.showXpInfo && (
              <ColorPicker
                label="XP Text Color"
                value={settings.xpTextColor}
                onChange={(color) => onChange({ xpTextColor: color || '#9CA3AF' })}
                defaultColor="#9CA3AF"
              />
            )}

            {settings.showProgressBar && (
              <>
                <ColorPicker
                  label="Progress Bar Fill Color"
                  value={settings.progressBarFillColor}
                  onChange={(color) => onChange({ progressBarFillColor: color || '#5865F2' })}
                  defaultColor="#5865F2"
                />
                <ColorPicker
                  label="Progress Bar Background Color"
                  value={settings.progressBarBgColor}
                  onChange={(color) => onChange({ progressBarBgColor: color || '#374151' })}
                  defaultColor="#374151"
                />
                <ColorPicker
                  label="Progress Bar Text Color"
                  value={settings.progressBarTextColor}
                  onChange={(color) => onChange({ progressBarTextColor: color || '#9CA3AF' })}
                  defaultColor="#9CA3AF"
                />
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Progress Bar Style</label>
                  <select
                    value={settings.progressBarStyle}
                    onChange={(e) => onChange({ progressBarStyle: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="gradient">Gradient</option>
                  </select>
                </div>
              </>
            )}

            <ColorPicker
              label="Avatar Border Color"
              value={settings.avatarBorderColor}
              onChange={(color) => onChange({ avatarBorderColor: color || '#5865F2' })}
              defaultColor="#5865F2"
            />
          </div>
        )}

        {activeTab === 'visibility' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Element Visibility</h3>
            
            <VisibilityToggle
              label="Avatar"
              visible={settings.showAvatar}
              onChange={(visible) => onChange({ showAvatar: visible })}
            />
            <VisibilityToggle
              label="Username"
              visible={settings.showUsername}
              onChange={(visible) => onChange({ showUsername: visible })}
            />
            <VisibilityToggle
              label="Prestige Badge"
              visible={settings.showPrestige}
              onChange={(visible) => onChange({ showPrestige: visible })}
            />
            <VisibilityToggle
              label="Level Indicator"
              visible={settings.showLevel}
              onChange={(visible) => onChange({ showLevel: visible })}
            />
            <VisibilityToggle
              label="XP Info"
              visible={settings.showXpInfo}
              onChange={(visible) => onChange({ showXpInfo: visible })}
            />
            <VisibilityToggle
              label="Progress Bar"
              visible={settings.showProgressBar}
              onChange={(visible) => onChange({ showProgressBar: visible })}
            />
            <VisibilityToggle
              label="Progress Text"
              visible={settings.showProgressText}
              onChange={(visible) => onChange({ showProgressText: visible })}
            />
          </div>
        )}

        {activeTab === 'effects' && (
          <EffectControls
            settings={{
              shadowEnabled: settings.shadowEnabled,
              shadowBlur: settings.shadowBlur,
              shadowOffsetX: settings.shadowOffsetX,
              shadowOffsetY: settings.shadowOffsetY,
              shadowColor: settings.shadowColor,
              backgroundStyle: settings.backgroundStyle,
              accentBarPosition: settings.accentBarPosition,
              accentBarWidth: settings.accentBarWidth,
              accentBarOpacity: settings.accentBarOpacity,
            }}
            onChange={(updates) => onChange(updates)}
          />
        )}

        {activeTab === 'presets' && (
          <LayoutPresets
            onApply={(presetSettings) => {
              onChange(presetSettings);
              setActiveTab('position');
            }}
          />
        )}
      </div>

      {/* Reset Button */}
      <div className="p-4 border-t border-[#40444b]">
        <button
          onClick={onReset}
          className="w-full px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

