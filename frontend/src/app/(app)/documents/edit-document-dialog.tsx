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
import { api, ApiError } from "@/lib/api";
import type { AppDocument } from "@/lib/types";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "contract", label: "Contract" },
  { value: "legal", label: "Legal" },
  { value: "financial", label: "Financial" },
  { value: "other", label: "Other" },
];

const documentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  category: z.string().min(1, "Category is required").max(50),
  expires_at: z.string().optional().or(z.literal("")),
});

type DocumentValues = z.infer<typeof documentSchema>;

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: AppDocument | null;
  onSaved: () => void;
}

export function EditDocumentDialog({ open, onOpenChange, document, onSaved }: EditDocumentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DocumentValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { title: "", category: "general", expires_at: "" },
  });

  useEffect(() => {
    if (open && document) {
      form.reset({
        title: document.title,
        category: document.category,
        expires_at: document.expires_at ?? "",
      });
    }
  }, [open, document, form]);

  async function onSubmit(values: DocumentValues) {
    if (!document) return;

    setIsSubmitting(true);
    try {
      await api.put(`/documents/${document.id}`, {
        title: values.title,
        category: values.category,
        expires_at: values.expires_at || null,
      });
      toast.success("Document updated successfully.");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            form.setError(field as keyof DocumentValues, { message: messages[0] });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>Update the title, category, or expiry date.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires on</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
