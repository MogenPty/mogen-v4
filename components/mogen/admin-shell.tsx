"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ExternalLink,
  FileQuestion,
  LayoutDashboard,
  Package,
  Route,
  SearchCheck,
} from "lucide-react";
import ThemeToggle from "@/components/mogen/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const groups = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/packages", label: "Packages", icon: Package },
      { href: "/admin/promotions", label: "Promotions", icon: BadgePercent },
    ],
  },
  {
    label: "Traffic",
    items: [
      { href: "/admin/redirects", label: "Redirects", icon: Route },
      { href: "/admin/not-found", label: "404 monitor", icon: FileQuestion },
      { href: "/admin/search-console", label: "Search Console", icon: SearchCheck },
    ],
  },
] as const;

function isCurrentRoute(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export default function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-4 focus:py-3 focus:text-foreground">
        Skip to admin content
      </a>
      <Sidebar collapsible="icon" className="border-sidebar-border">
        <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
          <Link href="/admin" className="flex min-h-11 items-center gap-3 overflow-hidden rounded-md px-1" aria-label="Mogen administration home">
            <span className="grid size-9 shrink-0 place-items-center bg-sidebar-primary font-display text-sm font-black text-sidebar-primary-foreground">M</span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block font-display text-lg font-black tracking-tight">MOGEN</span>
              <span className="small-caps block truncate text-sidebar-foreground/60">Administration</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          {groups.map(group => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="small-caps">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isCurrentRoute(pathname, item.href)} tooltip={item.label} size="lg">
                          <Link href={item.href}>
                            <Icon aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-3">
          <div className="flex min-h-11 items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <span className="small-caps text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">Appearance</span>
            <ThemeToggle className="h-11 w-11" menuPlacement="up" menuAlign="left" />
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="View public site" size="lg">
                <Link href="/" target="_blank">
                  <ExternalLink aria-hidden="true" />
                  <span>View public site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="size-11" />
          <div className="h-5 w-px bg-border" aria-hidden="true" />
          <p className="small-caps truncate text-muted-foreground">Mogen operations</p>
        </header>
        <div id="admin-content" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
