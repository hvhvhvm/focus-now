import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  LogOut, 
  User, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  userPoints: number;
  momentumScore: number;
  onReset?: () => void;
  currentUser?: any;
  onLogout?: () => void;
}

export default function Sidebar({ currentTab, setTab, userPoints, momentumScore, onReset, currentUser, onLogout }: SidebarProps) {
  // Read state from localStorage to persist user layout preference
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Keep localStorage updated
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'habits', name: 'Habits', icon: CheckSquare },
    { id: 'momentum', name: 'Momentum', icon: Activity, badge: `${momentumScore}%` },
    { id: '1%better', name: '1% Better', icon: TrendingUp, isNew: true },
    { id: 'insights', name: 'Insights', icon: BarChart3 }
  ];

  return (
    <aside className={`border-r border-[#1E222A] bg-[#0E1013] flex flex-col justify-between h-screen sticky top-0 text-gray-300 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`p-6 flex flex-col ${isCollapsed ? 'items-center px-3' : ''}`}>
        
        {/* Brand Logo & Interactive Collapse Control Header */}
        <div className={`flex items-center justify-between mb-8 cursor-pointer select-none ${isCollapsed ? 'flex-col gap-4 w-full' : 'w-full'}`}>
          <div className="flex items-center space-x-3" onClick={() => setTab('dashboard')}>
            <div className="bg-[#12B886]/10 p-2.5 rounded-xl text-[#12B886] border border-[#12B886]/20 transition-transform hover:scale-105">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            {!isCollapsed && (
              <div className="transition-all duration-300 opacity-100 whitespace-nowrap overflow-hidden">
                <span className="font-bold text-base text-white font-sans tracking-wide">Focus Now</span>
                <p className="text-[9px] text-gray-500 font-mono tracking-wider">MOMENTUM ENGINE</p>
              </div>
            )}
          </div>

          <button 
            id="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg bg-[#14161F] hover:bg-[#1C2030] border border-[#212535] text-gray-400 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 ${isCollapsed ? 'mt-1' : ''}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1.5 w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => setTab(item.id)}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#181C24] text-white border border-[#2D3446]'
                    : 'text-gray-400 hover:text-white hover:bg-[#12141C]/50 border border-transparent'
                } ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#12B886]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  {!isCollapsed && <span className="font-sans whitespace-nowrap">{item.name}</span>}
                </div>
                
                {!isCollapsed && item.badge && (
                  <span className="text-[10px] font-mono font-semibold bg-[#FA5252]/10 text-[#FA5252] border border-[#FA5252]/20 px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                )}

                {!isCollapsed && item.isNew && (
                  <span className="text-[9px] font-sans font-medium bg-[#12B886]/10 text-[#12B886] border border-[#12B886]/40 px-1.5 py-0.5 rounded-full">
                    New
                  </span>
                )}

                {isCollapsed && (item.badge || item.isNew) && (
                  <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${item.isNew ? 'bg-[#12B886]' : 'bg-[#FA5252]'}`} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Real User Profile Banner & Log-Out inside the Menubar Footer */}
      <div className={`border-t border-[#1E222A] bg-[#0A0B0D] flex flex-col transition-all duration-300 ${isCollapsed ? 'p-3 gap-3' : 'p-5 gap-4'}`}>
        
        {/* User profile details row */}
        <div className={`bg-[#11131a] border border-[#212530] rounded-xl flex items-center transition-all duration-300 ${isCollapsed ? 'p-1.5 justify-center' : 'p-3 gap-3'}`}>
          <div 
            className="w-9 h-9 rounded-lg bg-[#12B886]/10 border border-[#12B886]/30 flex items-center justify-center font-mono text-xs font-bold text-[#12B886] shadow-[0_0_12px_rgba(18,184,134,0.1)] flex-shrink-0"
            title={currentUser?.email}
          >
            {currentUser?.email?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden transition-all duration-300">
              <p className="text-[10px] text-gray-500 font-mono tracking-wider flex items-center gap-1 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-[#12B886]" />
                <span>Verified Session</span>
              </p>
              <p className="text-xs font-semibold text-white truncate font-sans" title={currentUser?.email}>
                {currentUser?.email || 'Active tracker'}
              </p>
            </div>
          )}
        </div>

        {/* Responsive buttons list */}
        <div className="flex flex-col gap-2 w-full">
          {onLogout && (
            <button
              onClick={onLogout}
              className={`w-full rounded-lg bg-[#FA5252]/5 hover:bg-[#FA5252]/15 border border-[#FA5252]/20 hover:border-[#FA5252]/40 text-xs font-semibold text-[#FA5252] font-sans flex items-center transition-all duration-200 cursor-pointer active:scale-[0.98] ${isCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 py-2.5 px-3.5'}`}
              title="Sign Out Session"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Sign Out Session</span>}
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className={`w-full flex items-center border border-transparent rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer ${isCollapsed ? 'justify-center py-2 text-gray-600 hover:text-red-400' : 'justify-center space-x-1 px-3 py-1.5 text-gray-450 hover:text-gray-400'}`}
              title="Reset tracked logs to default preset"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-600 hover:animate-spin flex-shrink-0" />
              {!isCollapsed && <span>Full Reset</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
