
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Settings, 
  User, 
  CreditCard, 
  LogOut, 
  Menu, 
  FileEdit,
  Users,
  Package,
  Image,
  Home,
  BoxIcon,
  BarChart3,
  Receipt,
  Truck,
  Building2,
  FolderOpen,
  Sparkles,
  CheckSquare,
  ArrowRightLeft,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import OrgSwitcher from "@/components/OrgSwitcher";

interface AppLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  proOnly?: boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", path: "/", icon: Home },
      { label: "Projects", path: "/projects", icon: FolderOpen },
      { label: "Tasks & Time", path: "/tasks", icon: CheckSquare },
      { label: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Invoices", path: "/invoices", icon: FileText },
      { label: "Estimates", path: "/estimates", icon: FileEdit },
      { label: "Receipts", path: "/receipts", icon: CreditCard },
      { label: "Proposals (AI)", path: "/proposals", icon: Sparkles },
      { label: "Clients", path: "/clients", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Products", path: "/products", icon: Package },
      { label: "Inventory", path: "/inventory", icon: BoxIcon },
      { label: "Suppliers", path: "/suppliers", icon: Building2 },
      { label: "Expenses", path: "/expenses", icon: Receipt },
      { label: "Purchase Orders", path: "/purchase-orders", icon: FileText },
      { label: "Delivery", path: "/delivery", icon: Truck },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Staff & Payroll", path: "/staff", icon: Users },
      { label: "Profile", path: "/profile", icon: User },
      { label: "Sub Users", path: "/sub-users", icon: User, proOnly: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Admin & PSA", path: "/admin", icon: Activity, adminOnly: true },
      { label: "Members", path: "/org/members", icon: Users, adminOnly: true },
      { label: "Payment Methods", path: "/payment-methods", icon: CreditCard, adminOnly: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Portfolio", path: "/portfolio", icon: Image },
      { label: "Currency", path: "/currency", icon: ArrowRightLeft },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

const mobilePrimaryPaths = ["/", "/invoices", "/clients", "/products", "/settings"];

const AppLayout = ({ children, onLogout }: AppLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, currentUserRole } = useAppContext();
  const canManageOrg = currentUserRole === "owner" || currentUserRole === "admin";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const visibleNavGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (item.proOnly && user?.plan !== "pro") return false;
            if (item.adminOnly && !canManageOrg) return false;
            return true;
          }),
        }))
        .filter((group) => group.items.length > 0),
    [canManageOrg, user?.plan]
  );

  const allNavItems = visibleNavGroups.flatMap((group) => group.items);
  const mobilePrimaryItems = mobilePrimaryPaths
    .map((path) => allNavItems.find((item) => item.path === path))
    .filter((item): item is NavItem => Boolean(item));

  const NavLinkButton = ({
    item,
    compact = false,
    onNavigate,
  }: {
    item: NavItem;
    compact?: boolean;
    onNavigate?: () => void;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Button
        variant="ghost"
        className={cn(
          "h-11 w-full justify-start rounded-xl text-sm",
          active && "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
          compact && "h-12 justify-center px-0"
        )}
        asChild
      >
        <Link
          to={item.path}
          onClick={onNavigate}
          aria-label={compact ? item.label : undefined}
          title={compact ? item.label : undefined}
        >
          <Icon className={cn("h-4 w-4 shrink-0", compact ? "" : "mr-3")} />
          {!compact && <span className="truncate">{item.label}</span>}
        </Link>
      </Button>
    );
  };

  const AccountSummary = ({ compact = false }: { compact?: boolean }) => {
    if (!user) return null;

    return (
      <div
        className={cn(
          "rounded-2xl bg-teal-50 dark:bg-teal-950/30",
          compact ? "p-2 text-center" : "p-3"
        )}
      >
        <p className={cn("font-medium text-teal-800 dark:text-teal-300", compact ? "text-xs" : "text-sm")}>
          {compact ? user.company.name.substring(0, 2).toUpperCase() : user.company.name}
        </p>
        {!compact && (
          <p className="mt-1 text-xs capitalize text-teal-700/70 dark:text-teal-400/70">
            {user.plan} Plan{user.isDemoAccount && " (Demo)"}
          </p>
        )}
      </div>
    );
  };

  const ProStatus = ({ compact = false }: { compact?: boolean }) => {
    if (!user) return null;

    if (user.plan === "pro") {
      return (
        <div
          className={cn(
            "rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
            compact ? "p-2 text-center text-[10px] font-semibold uppercase" : "p-3"
          )}
        >
          {compact ? (
            "Pro"
          ) : (
            <>
              <p className="text-sm font-medium">Pro Account</p>
              <p className="mt-1 text-xs text-amber-700/70 dark:text-amber-400/70">Unlimited operations</p>
            </>
          )}
        </div>
      );
    }

    return compact ? (
      <Button size="sm" className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-0" asChild>
        <Link to="/premium" aria-label="Upgrade to Pro" title="Upgrade to Pro">
          Pro
        </Link>
      </Button>
    ) : (
      <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" asChild>
        <Link to="/premium">Upgrade to Pro</Link>
      </Button>
    );
  };

  const MobileMenuContent = () => (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-gray-200 pb-3 text-left dark:border-gray-800">
        <SheetTitle className="text-base text-teal-600 dark:text-teal-400">Grabio Finance</SheetTitle>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Powered by emoove.co
          </p>
          {user && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {user.plan}
            </span>
          )}
        </div>
      </SheetHeader>

      <div className="mt-4 space-y-4 overflow-y-auto pr-1">
        {user && (
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3 dark:border-teal-900 dark:bg-teal-950/30">
            <p className="truncate text-sm font-semibold text-teal-800 dark:text-teal-300">{user.company.name}</p>
            <p className="mt-1 text-xs text-teal-700/70 dark:text-teal-400/70">
              Tap a shortcut below or open a section.
            </p>
          </div>
        )}

        <div>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Quick access
          </p>
          <div className="grid grid-cols-2 gap-2">
            {mobilePrimaryItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-sm font-medium shadow-sm dark:border-gray-800 dark:bg-gray-950",
                    active && "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {visibleNavGroups.map((group) => (
            <AccordionItem
              key={group.label}
              value={group.label}
              className="rounded-2xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <AccordionTrigger className="min-h-12 py-3 text-sm font-semibold no-underline hover:no-underline">
                <span>{group.label}</span>
                <span className="ml-auto mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {group.items.length}
                </span>
              </AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-2 pb-3">
                {group.items.map((item) => (
                  <NavLinkButton
                    key={item.path}
                    item={item}
                    onNavigate={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
        <Button
          variant="ghost"
          className="h-11 w-full justify-start rounded-xl text-sm text-red-600 dark:text-red-400"
          onClick={() => {
            setIsMobileMenuOpen(false);
            onLogout();
          }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="flex h-full w-[88vw] max-w-sm flex-col p-4 sm:max-w-md md:hidden">
          <MobileMenuContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 lg:flex">
        <div className="flex-shrink-0 p-4">
          <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400">Grabio Finance</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Powered by emoove.co
          </p>
          <div className="mt-4">
            <AccountSummary />
          </div>
        </div>

        <nav className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {visibleNavGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLinkButton key={item.path} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 space-y-2 border-t border-gray-200 p-4 dark:border-gray-800">
          <ProStatus />
          <Button
            variant="ghost"
            className="h-11 w-full justify-start rounded-xl text-sm text-red-600 dark:text-red-400"
            onClick={onLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Tablet Rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col border-r border-gray-200 bg-white px-3 py-4 dark:border-gray-800 dark:bg-gray-950 md:flex lg:hidden">
        <Link to="/" className="mb-4 flex h-12 w-full items-center justify-center rounded-2xl bg-teal-50 text-lg font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
          GF
        </Link>
        <div className="mb-4">
          <AccountSummary compact />
        </div>
        <nav className="flex-grow space-y-2 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLinkButton key={item.path} item={item} compact />
          ))}
        </nav>
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
          <ProStatus compact />
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-red-600 dark:text-red-400"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:pl-20 lg:pl-64">
        {/* Top Nav */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-3 sm:px-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(true)}
              className="h-11 w-11 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0 md:hidden">
              <p className="text-sm font-bold leading-tight text-teal-600 dark:text-teal-400">Grabio Finance</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">emoove.co</p>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <OrgSwitcher />
              {user && (
                <div className="hidden items-center space-x-2 sm:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm text-white">
                    {user.company.logo ? (
                      <img 
                        src={user.company.logo} 
                        alt={user.company.name} 
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      user.company.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="hidden max-w-[180px] truncate text-sm font-medium xl:inline">{user.company.name}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {user.plan === "pro" ? "Pro" : "Free"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="app-content p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="hidden border-t border-gray-200 px-6 py-3 dark:border-gray-800 md:block">
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            Grabio Finance · Powered by emoove.co
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-medium text-gray-600 dark:text-gray-300",
                  active && "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                )}
              >
                <Icon className="mb-1 h-5 w-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
