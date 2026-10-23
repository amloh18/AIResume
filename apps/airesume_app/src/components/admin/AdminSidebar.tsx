'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  DollarSign,
  CreditCard,
  Package,
  Mail,
  Cpu,
  LogOut,
} from 'lucide-react';

interface AdminSidebarProps {
  user: { name: string; email: string };
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/plans', label: 'Plans', icon: Package },
  { href: '/admin/campaigns', label: 'Email Campaigns', icon: Mail },
  { href: '/admin/ai', label: 'AI Models', icon: Cpu },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
];

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside className="md:w-60 md:min-h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#101408] flex-shrink-0">
      <div className="p-4">
        <Link href="/admin" className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            AI
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">Admin</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">AIResume</div>
          </div>
        </Link>

        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-white/5 hidden md:block">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate" title={user.email}>
          {user.name}
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
