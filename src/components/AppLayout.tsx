import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, Wallet, FileText, UserCircle, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Главная' },
  { to: '/loans', icon: Wallet, label: 'Мои займы' },
  { to: '/documents', icon: FileText, label: 'Документы' },
  { to: '/profile', icon: UserCircle, label: 'Профиль' },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name?.split(' ')[0] || 'Пользователь';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border/50 bg-card/50 sticky top-0 h-screen">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm font-display">P2P Займы</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 space-y-2 border-t border-border/50">
          <Button
            onClick={() => navigate('/loans/create')}
            className="w-full gap-2 rounded-lg h-9 text-xs"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Новый займ
          </Button>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground truncate">{displayName}</span>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Выйти"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-pb">
        <nav className="flex items-center justify-around h-14">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1 px-3 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};
