"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  XAxis,
} from "recharts";
import { Download, FileBarChart, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DataPagination } from "@/components/data-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError, API_URL, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ForecastResponse, PaginationMeta, Report } from "@/lib/types";

interface ReportsResponse {
  reports: Report[];
  meta: PaginationMeta;
}

interface ReportResponse {
  report: Report;
}

const REPORT_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const SEVERITY_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
};

const forecastChartConfig: ChartConfig = {
  amount: {
    label: "Actual revenue",
    color: "var(--color-chart-1)",
  },
  projected_amount: {
    label: "Projected revenue",
    color: "var(--color-chart-2)",
  },
  expected_from_due_invoices: {
    label: "Due invoices",
    color: "var(--color-chart-3)",
  },
};

export default function ReportsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [reports, setReports] = useState<Report[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateType, setGenerateType] = useState("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(true);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (typeFilter !== "all") params.set("type", typeFilter);

      const data = await api.get<ReportsResponse>(`/reports?${params.toString()}`);
      setReports(data.reports);
      setMeta(data.meta);
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    api
      .get<ForecastResponse>("/forecast")
      .then(setForecast)
      .catch(() => toast.error("Failed to load cash flow forecast."))
      .finally(() => setIsLoadingForecast(false));
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const payload: Record<string, unknown> = { type: generateType };
      if (periodStart) payload.period_start = periodStart;
      if (periodEnd) payload.period_end = periodEnd;

      const data = await api.post<ReportResponse>("/reports", payload);
      toast.success("Report generated successfully.");
      setGenerateOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      setPage(1);
      loadReports();
      setViewingReport(data.report);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to generate report.");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/reports/${deleteTarget.id}`);
      toast.success("Report deleted successfully.");
      setDeleteTarget(null);
      loadReports();
    } catch {
      toast.error("Failed to delete report.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function downloadPdf(report: Report) {
    setDownloadingId(report.id);
    try {
      const response = await fetch(`${API_URL}/reports/${report.id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${report.type}-${report.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download PDF.");
    } finally {
      setDownloadingId(null);
    }
  }

  const forecastChartData = forecast
    ? [
        ...forecast.history.map((point) => ({ month: point.month, amount: point.amount })),
        ...forecast.projection.map((point) => ({
          month: point.month,
          projected_amount: point.projected_amount,
          expected_from_due_invoices: point.expected_from_due_invoices,
        })),
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Generate AI-powered business reports and review your cash flow outlook.
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="size-4" />
          Generate report
        </Button>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="forecast">Cash Flow Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <FileBarChart className="size-8" />
                  <p>No reports generated yet.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Generated by</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-32" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium capitalize">{report.type}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(report.period_start)} - {formatDate(report.period_end)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{report.generated_by ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(report.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setViewingReport(report)}>
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => downloadPdf(report)}
                                disabled={downloadingId === report.id}
                              >
                                {downloadingId === report.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Download className="size-4" />
                                )}
                              </Button>
                              {canManage && (
                                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(report)}>
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {meta && <DataPagination meta={meta} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          {isLoadingForecast || !forecast ? (
            <div className="space-y-4">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue History & Projection</CardTitle>
                  <CardDescription>
                    Historical revenue and a weighted projection for the upcoming months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={forecastChartConfig} className="h-72 w-full">
                    <AreaChart data={forecastChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                      />
                      <Legend />
                      <Area
                        dataKey="amount"
                        type="monotone"
                        name="Actual revenue"
                        fill="var(--color-amount)"
                        fillOpacity={0.2}
                        stroke="var(--color-amount)"
                        strokeWidth={2}
                        connectNulls
                      />
                      <Area
                        dataKey="projected_amount"
                        type="monotone"
                        name="Projected revenue"
                        fill="var(--color-projected_amount)"
                        fillOpacity={0.15}
                        stroke="var(--color-projected_amount)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        connectNulls
                      />
                      <Line
                        dataKey="expected_from_due_invoices"
                        type="monotone"
                        name="Due invoices"
                        stroke="var(--color-expected_from_due_invoices)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    AI Narrative
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{forecast.narrative}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risks & Alerts</CardTitle>
                  <CardDescription>Potential cash flow risks based on your current data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {forecast.risks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No significant risks detected.</p>
                  ) : (
                    forecast.risks.map((risk, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <Badge variant={SEVERITY_BADGE[risk.severity] ?? "outline"} className="uppercase">
                          {risk.severity}
                        </Badge>
                        <p className="text-sm">{risk.message}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate report</DialogTitle>
            <DialogDescription>
              Choose a report type and optionally a custom date range. Leave the dates empty to use the
              current period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report type</Label>
              <Select value={generateType} onValueChange={setGenerateType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Start date (optional)</Label>
                <Input
                  id="period-start"
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">End date (optional)</Label>
                <Input
                  id="period-end"
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="size-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {viewingReport && (
            <>
              <SheetHeader>
                <SheetTitle className="capitalize">{viewingReport.type} report</SheetTitle>
                <SheetDescription>
                  {formatDate(viewingReport.period_start)} - {formatDate(viewingReport.period_end)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-4">
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-primary" />
                    AI Summary
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {viewingReport.ai_summary}
                  </p>
                </div>

                {viewingReport.data && (
                  <ReportDataBreakdown data={viewingReport.data} />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this <span className="capitalize">{deleteTarget?.type}</span> report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ReportData {
  revenue?: {
    total_collected?: number;
    invoices_issued_count?: number;
    invoices_issued_total?: number;
  };
  customers?: {
    new?: number;
    top?: { name: string; amount: number }[];
  };
  outstanding?: {
    count?: number;
    total?: number;
    overdue_count?: number;
    overdue_total?: number;
  };
}

function ReportDataBreakdown({ data }: { data: Record<string, unknown> }) {
  const report = data as ReportData;

  return (
    <div className="space-y-4">
      {report.revenue && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Revenue</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Total collected</dt>
            <dd className="text-right font-medium">{formatCurrency(report.revenue.total_collected ?? 0)}</dd>
            <dt className="text-muted-foreground">Invoices issued</dt>
            <dd className="text-right font-medium">{report.revenue.invoices_issued_count ?? 0}</dd>
            <dt className="text-muted-foreground">Invoiced amount</dt>
            <dd className="text-right font-medium">{formatCurrency(report.revenue.invoices_issued_total ?? 0)}</dd>
          </dl>
        </div>
      )}

      {report.outstanding && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Outstanding</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Open invoices</dt>
            <dd className="text-right font-medium">{report.outstanding.count ?? 0}</dd>
            <dt className="text-muted-foreground">Outstanding total</dt>
            <dd className="text-right font-medium">{formatCurrency(report.outstanding.total ?? 0)}</dd>
            <dt className={cn("text-muted-foreground", (report.outstanding.overdue_count ?? 0) > 0 && "text-destructive")}>
              Overdue invoices
            </dt>
            <dd className={cn("text-right font-medium", (report.outstanding.overdue_count ?? 0) > 0 && "text-destructive")}>
              {report.outstanding.overdue_count ?? 0}
            </dd>
            <dt className="text-muted-foreground">Overdue total</dt>
            <dd className="text-right font-medium">{formatCurrency(report.outstanding.overdue_total ?? 0)}</dd>
          </dl>
        </div>
      )}

      {report.customers && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Customers</h3>
          <p className="text-sm">
            <span className="text-muted-foreground">New customers: </span>
            <span className="font-medium">{report.customers.new ?? 0}</span>
          </p>
          {report.customers.top && report.customers.top.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Top customers by payments received</p>
              {report.customers.top.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <span>{entry.name}</span>
                  <span className="font-medium">{formatCurrency(entry.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
