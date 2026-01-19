import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Heart,
  ClipboardList,
  FileText,
  Menu,
  X,
  ChevronLeft,
  FileEdit,
  CheckSquare,
  User,
} from 'lucide-react';
import type { UserRole } from '../../types/database';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin', 'coach', 'couple'],
  },
  {
    to: '/coaches',
    label: 'Coaches',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    to: '/couples',
    label: 'Couples',
    icon: <Heart className="h-5 w-5" />,
    roles: ['admin', 'coach'],
  },
  {
    to: '/assignments',
    label: 'Assignments',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['admin', 'coach'],
  },
  {
    to: '/homework',
    label: 'My Homework',
    icon: <FileEdit className="h-5 w-5" />,
    roles: ['couple'],
  },
  {
    to: '/reviews',
    label: 'Reviews',
    icon: <CheckSquare className="h-5 w-5" />,
    roles: ['admin', 'coach'],
  },
  {
    to: '/forms',
    label: 'Form Builder',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    to: '/profile',
    label: 'My Profile',
    icon: <User className="h-5 w-5" />,
    roles: ['admin', 'coach', 'couple'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { role } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          'w-64'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Ministry</span>
            </div>
          )}
          {isCollapsed && (
            <Heart className="h-6 w-6 text-primary mx-auto" />
          )}
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-muted rounded-md"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      isCollapsed && 'justify-center px-2'
                    )
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:flex border-t p-2">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn(
                'h-5 w-5 transition-transform',
                isCollapsed && 'rotate-180'
              )}
            />
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

interface MobileMenuButtonProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 hover:bg-muted rounded-md"
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
