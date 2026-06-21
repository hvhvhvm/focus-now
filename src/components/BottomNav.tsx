import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Activity,
  TrendingUp,
  User,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'momentum', label: 'Momentum', icon: Activity },
  { id: '1%better', label: '1% Better', icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function BottomNav({
  currentTab,
  setTab,
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
        <div className="flex items-stretch h-[64px]">
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
                    isActive ? 'w-[22px] h-[22px] drop-shadow-[0_0_6px_rgba(18,184,134,0.8)]' : 'w-[22px] h-[22px]'
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold font-sans transition-all leading-none ${
                    isActive ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
