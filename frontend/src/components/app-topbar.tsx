"use client";

import Link from "next/link";
import { Bell, LogOut, Settings, User as UserIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAlerts } from "@/hooks/use-alerts";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-chart-5/40 bg-chart-5/10 text-chart-5",
  info: "border-primary/40 bg-primary/10 text-primary",
};

export function AppTopbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const { alerts, unreadCount, markRead, markAllRead } = useAlerts();

  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="flex-1 truncate text-sm font-medium text-foreground">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 size-5 justify-center rounded-full p-0 text-[10px]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="p-0">Alerts</DropdownMenuLabel>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <DropdownMenuSeparator />
          {alerts.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                onSelect={(event) => {
                  event.preventDefault();
                  markRead(alert.id);
                }}
                className="flex flex-col items-start gap-1 whitespace-normal"
              >
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
                  )}
                >
                  {alert.severity}
                </span>
                <span className="text-xs text-foreground">{alert.message}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden flex-col items-start text-left sm:flex">
              <span className="text-xs font-medium leading-none">{user?.name}</span>
              <span className="text-[11px] capitalize leading-none text-muted-foreground">
                {user?.role}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <UserIcon className="size-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()} variant="destructive">
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
