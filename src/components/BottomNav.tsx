import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Activity,
  TrendingUp,
  BarChart3,
  LogOut,
  User
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
  momentumScore: number;
  currentUser?: any;
  onLogout?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'momentum', label: 'Momentum', icon: Activity },
  { id: '1%better', label: '1% Better', icon: TrendingUp },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export default function BottomNav({
  currentTab,
  setTab,
  momentumScore,
  currentUser,
  onLogout,
}: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Glassmorphism background */}
      <div
        className="border-t border-[#1E222A]/80 bg-[#0A0B0E]/95"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-stretch h-[60px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                id={`bottom-nav-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] relative transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isActive ? 'text-[#12B886]' : 'text-gray-500 hover:text-gray-300'
                }`}
                aria-label={item.label}
              >
                {/* Active indicator pill at top */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#12B886] rounded-full shadow-[0_0_8px_rgba(18,184,134,0.8)]" />
                )}

                <Icon
                  className={`transition-all duration-200 ${
                    isActive ? 'w-5 h-5 drop-shadow-[0_0_6px_rgba(18,184,134,0.8)]' : 'w-5 h-5'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold font-sans transition-all leading-none ${
                    isActive ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* User/logout slot — compact avatar */}
          {onLogout && (
            <button
              id="bottom-nav-logout"
              onClick={onLogout}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-gray-500 hover:text-[#FA5252] transition-all duration-200 cursor-pointer select-none active:scale-95"
              aria-label="Sign out"
            >
              <div className="w-5 h-5 rounded-md bg-[#12B886]/10 border border-[#12B886]/20 flex items-center justify-center text-[#12B886] text-[9px] font-mono font-black leading-none">
                {currentUser?.email?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <span className="text-[10px] font-semibold font-sans opacity-60 leading-none">
                Out
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
