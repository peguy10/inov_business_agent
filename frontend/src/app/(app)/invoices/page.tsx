"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { DataPagination } from "@/components/data-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer, Invoice, InvoiceStatus, PaginationMeta } from "@/lib/types";

interface InvoicesResponse {
  invoices: Invoice[];
  meta: PaginationMeta;
}

interface CustomersResponse {
  customers: Customer[];
  meta: PaginationMeta;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<Invoice | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("customer_id");
    if (customerId) setCustomerFilter(customerId);
  }, []);

  useEffect(() => {
    api
      .get<CustomersResponse>("/customers?per_page=100")
      .then((data) => setCustomers(data.customers))
      .catch(() => {});
  }, []);

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "15" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (customerFilter) params.set("customer_id", customerFilter);

      const data = await api.get<InvoicesResponse>(`/invoices?${params.toString()}`);
      setInvoices(data.invoices);
      setMeta(data.meta);
    } catch {
      toast.error("Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search, customerFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  function openCreateDialog() {
    setEditingInvoice(null);
    setDialogOpen(true);
  }

  function openEditDialog(invoice: Invoice) {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/invoices/${deleteTarget.id}`);
      toast.success("Invoice deleted successfully.");
      setDeleteTarget(null);
      loadInvoices();
    } catch {
      toast.error("Failed to delete invoice.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmMarkPaid() {
    if (!markPaidTarget) return;

    setIsMarkingPaid(true);
    try {
      await api.post(`/invoices/${markPaidTarget.id}/mark-paid`);
      toast.success("Invoice marked as paid.");
      setMarkPaidTarget(null);
      loadInvoices();
    } catch {
      toast.error("Failed to mark invoice as paid.");
    } finally {
      setIsMarkingPaid(false);
    }
  }

  const customerFilterName = customerFilter
    ? customers.find((customer) => String(customer.id) === customerFilter)?.name
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Track and manage customer invoices.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          New invoice
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice # or customer..."
                className="pl-8"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "all" | InvoiceStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            {customerFilter && (
              <Badge variant="outline" className="gap-1 py-1">
                Customer: {customerFilterName ?? customerFilter}
                <button
                  type="button"
                  onClick={() => {
                    setCustomerFilter(null);
                    setPage(1);
                  }}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No invoices found.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.customer?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.outstanding_amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.issued_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openEditDialog(invoice)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && (
                              <DropdownMenuItem onSelect={() => setMarkPaidTarget(invoice)}>
                                <CheckCircle2 className="size-4" />
                                Mark as paid
                              </DropdownMenuItem>
                            )}
                            {canManage && (
                              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(invoice)}>
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={editingInvoice}
        customers={customers}
        defaultCustomerId={customerFilter ?? undefined}
        onSaved={loadInvoices}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice{" "}
              <strong>{deleteTarget?.invoice_number}</strong> and its payment history.
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

      <AlertDialog open={!!markPaidTarget} onOpenChange={(open) => !open && setMarkPaidTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark invoice as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will record a payment of{" "}
              <strong>{markPaidTarget && formatCurrency(markPaidTarget.outstanding_amount)}</strong> for invoice{" "}
              <strong>{markPaidTarget?.invoice_number}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarkingPaid}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isMarkingPaid} onClick={confirmMarkPaid}>
              {isMarkingPaid && <Loader2 className="size-4 animate-spin" />}
              Mark as paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
