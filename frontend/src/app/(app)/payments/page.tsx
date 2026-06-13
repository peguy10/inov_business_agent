"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, MoreHorizontal, Plus, Receipt, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/data-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, PaginationMeta, Payment } from "@/lib/types";

interface PaymentsResponse {
  payments: Payment[];
  meta: PaginationMeta;
}

interface InvoicesResponse {
  invoices: Invoice[];
  meta: PaginationMeta;
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  card: "Card",
  cash: "Cash",
  check: "Check",
  other: "Other",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<PaymentsResponse>(`/payments?page=${page}&per_page=15`);
      setPayments(data.payments);
      setMeta(data.meta);
    } catch {
      toast.error("Failed to load payments.");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  const loadOutstandingInvoices = useCallback(async () => {
    try {
      const data = await api.get<InvoicesResponse>("/invoices?per_page=100");
      setOutstandingInvoices(data.invoices.filter((invoice) => invoice.outstanding_amount > 0));
    } catch {
      // non-critical: the record-payment dialog will simply show no invoices
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadOutstandingInvoices();
  }, [loadOutstandingInvoices]);

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/payments/${deleteTarget.id}`);
      toast.success("Payment deleted successfully.");
      setDeleteTarget(null);
      loadPayments();
      loadOutstandingInvoices();
    } catch {
      toast.error("Failed to delete payment.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSaved() {
    setPage(1);
    loadPayments();
    loadOutstandingInvoices();
  }

  const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => sum + invoice.outstanding_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Record and review payment history.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Record payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Across {outstandingInvoices.length} unpaid invoice(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recorded Payments</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{meta?.total ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Total payments on record</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-muted-foreground">{formatDate(payment.payment_date)}</TableCell>
                      <TableCell className="font-medium">{payment.invoice?.invoice_number ?? "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.invoice?.customer?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {METHOD_LABELS[payment.method] ?? payment.method}
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(payment)}>
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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

      <RecordPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoices={outstandingInvoices}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {deleteTarget && formatCurrency(deleteTarget.amount)} payment for invoice{" "}
              <strong>{deleteTarget?.invoice?.invoice_number}</strong> and update its outstanding balance.
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
