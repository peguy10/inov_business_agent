"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  FileText,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

import { BlurText } from "@/components/animations/blur-text";
import { FadeIn } from "@/components/animations/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { api } from "@/lib/api";
import type { DashboardResponse } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const revenueChartConfig: ChartConfig = {
  amount: {
    label: "Revenue",
    color: "var(--color-chart-1)",
  },
};

const cashFlowChartConfig: ChartConfig = {
  inflow: {
    label: "Inflow",
    color: "var(--color-chart-2)",
  },
  outflow: {
    label: "Outflow",
    color: "var(--color-chart-3)",
  },
};

const STATUS_COLORS: Record<string, string> = {
  paid: "var(--color-chart-4)",
  pending: "var(--color-chart-2)",
  overdue: "var(--color-destructive)",
};

const SEVERITY_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardResponse>("/dashboard")
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const { widgets, charts, alerts, recent_activity } = data;

  const statusConfig: ChartConfig = Object.fromEntries(
    charts.invoice_status.map((item) => [
      item.status,
      { label: item.status.charAt(0).toUpperCase() + item.status.slice(1) },
    ])
  );

  return (
    <div className="space-y-6">
      <div>
        <BlurText text="Dashboard" className="text-2xl font-semibold tracking-tight" />
        <p className="text-sm text-muted-foreground">
          A real-time overview of your business performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FadeIn delay={0}>
          <StatCard
            title="Revenue (this month)"
            value={formatCurrency(widgets.revenue.this_month)}
            countUp={{ value: widgets.revenue.this_month, decimals: 2, prefix: "$" }}
            changePct={widgets.revenue.change_pct}
            subtitle="vs. last month"
            icon={<TrendingUp className="size-4" />}
          />
        </FadeIn>
        <FadeIn delay={0.05}>
          <StatCard
            title="Outstanding Invoices"
            value={formatCurrency(widgets.outstanding_invoices.total)}
            countUp={{ value: widgets.outstanding_invoices.total, decimals: 2, prefix: "$" }}
            subtitle={`${widgets.outstanding_invoices.count} invoice(s), ${widgets.outstanding_invoices.overdue_count} overdue`}
            icon={<Receipt className="size-4" />}
          />
        </FadeIn>
        <FadeIn delay={0.1}>
          <StatCard
            title="Customers"
            value={widgets.customers.total.toString()}
            countUp={{ value: widgets.customers.total }}
            subtitle={`${widgets.customers.new_this_month} new this month`}
            icon={<Users className="size-4" />}
          />
        </FadeIn>
        <FadeIn delay={0.15}>
          <StatCard
            title="Profit (this month)"
            value={formatCurrency(widgets.profit.this_month)}
            countUp={{ value: widgets.profit.this_month, decimals: 2, prefix: "$" }}
            changePct={widgets.profit.change_pct}
            subtitle="vs. last month"
            icon={<CreditCard className="size-4" />}
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.1} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Payments received over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-64 w-full">
              <AreaChart data={charts.revenue_trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Area
                  dataKey="amount"
                  type="monotone"
                  fill="var(--color-amount)"
                  fillOpacity={0.2}
                  stroke="var(--color-amount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
            <CardDescription>Breakdown by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-64">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Pie data={charts.invoice_status} dataKey="total" nameKey="status" innerRadius={50}>
                  {charts.invoice_status.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "var(--color-chart-1)"} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {charts.invoice_status.map((entry) => (
                <div key={entry.status} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "var(--color-chart-1)" }}
                  />
                  <span className="capitalize text-muted-foreground">{entry.status}</span>
                  <span className="font-medium">({entry.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.15} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Inflow vs. outflow over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cashFlowChartConfig} className="h-64 w-full">
              <BarChart data={charts.cash_flow}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Bar dataKey="inflow" fill="var(--color-inflow)" radius={4} />
                <Bar dataKey="outflow" fill="var(--color-outflow)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Smart Alerts</CardTitle>
              <CardDescription>Things that need your attention</CardDescription>
            </div>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts. Everything looks good.</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="space-y-1 rounded-lg border border-border p-3">
                  <Badge variant={SEVERITY_BADGE[alert.severity] ?? "outline"} className="uppercase">
                    {alert.severity}
                  </Badge>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest invoices and payments</CardDescription>
          </div>
          <Link href="/invoices" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View invoices <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {recent_activity.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              recent_activity.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        item.type === "payment"
                          ? "bg-chart-4/10 text-chart-4"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {item.type === "payment" ? (
                        <CreditCard className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </FadeIn>
    </div>
  );
}
