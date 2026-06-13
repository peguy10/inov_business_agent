"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import type { Customer, Invoice } from "@/lib/types";

const invoiceSchema = z
  .object({
    customer_id: z.string().min(1, "Customer is required"),
    invoice_number: z.string().max(50).optional().or(z.literal("")),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be greater than 0"),
    issued_date: z.string().min(1, "Issued date is required"),
    due_date: z.string().min(1, "Due date is required"),
    status: z.enum(["pending", "paid", "overdue"]).optional(),
    description: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.due_date >= data.issued_date, {
    message: "Due date must be on or after the issued date",
    path: ["due_date"],
  });

type InvoiceValues = z.infer<typeof invoiceSchema>;

function emptyValues(defaultCustomerId?: string): InvoiceValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customer_id: defaultCustomerId ?? "",
    invoice_number: "",
    amount: "",
    issued_date: today,
    due_date: today,
    status: "pending",
    description: "",
  };
}

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  customers: Customer[];
  defaultCustomerId?: string;
  onSaved: () => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  customers,
  defaultCustomerId,
  onSaved,
}: InvoiceFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!invoice;

  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(
        invoice
          ? {
              customer_id: String(invoice.customer_id),
              invoice_number: invoice.invoice_number,
              amount: String(invoice.amount),
              issued_date: invoice.issued_date,
              due_date: invoice.due_date,
              status: invoice.status,
              description: invoice.description ?? "",
            }
          : emptyValues(defaultCustomerId)
      );
    }
  }, [open, invoice, defaultCustomerId, form]);

  async function onSubmit(values: InvoiceValues) {
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        customer_id: Number(values.customer_id),
        amount: Number(values.amount),
        issued_date: values.issued_date,
        due_date: values.due_date,
        description: values.description || null,
      };

      if (values.invoice_number) {
        payload.invoice_number = values.invoice_number;
      }

      if (isEditing && values.status) {
        payload.status = values.status;
      }

      if (isEditing) {
        await api.put(`/invoices/${invoice.id}`, payload);
        toast.success("Invoice updated successfully.");
      } else {
        await api.post("/invoices", payload);
        toast.success("Invoice created successfully.");
      }

      onOpenChange(false);
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            form.setError(field as keyof InvoiceValues, { message: messages[0] });
          });
        }
        toast.error(error.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit invoice" : "New invoice"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this invoice's details." : "Create a new invoice for a customer."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={String(customer.id)}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice #</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issued_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes about this invoice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Save changes" : "Create invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
