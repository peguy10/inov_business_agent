"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Receipt,
  Search,
  Trash2,
  Upload,
  Users,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditDocumentDialog } from "./edit-document-dialog";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import type { AppDocument, PaginationMeta, SearchResponse } from "@/lib/types";

interface DocumentsResponse {
  documents: AppDocument[];
  meta: PaginationMeta;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  contract: "Contract",
  legal: "Legal",
  financial: "Financial",
  other: "Other",
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
};

const SEARCH_TYPE_ICONS = {
  document: FileText,
  customer: Users,
  invoice: Receipt,
};

function isExpiringSoon(expiresAt: string | null): "expired" | "soon" | null {
  if (!expiresAt) return null;

  const diffDays = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return null;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AppDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "15" });
      if (category !== "all") params.set("category", category);

      const data = await api.get<DocumentsResponse>(`/documents?${params.toString()}`);
      setDocuments(data.documents);
      setMeta(data.meta);
    } catch {
      toast.error("Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const query = searchInput.trim();
    if (!query) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await api.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
        setSearchResults(data);
      } catch {
        toast.error("Search failed.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      toast.success("Document deleted successfully.");
      setDeleteTarget(null);
      loadDocuments();
    } catch {
      toast.error("Failed to delete document.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Store contracts, invoices, and other business documents.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload document
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-lg">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents, customers, invoices..."
              className="pl-8"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          {searchInput.trim() ? (
            <div className="space-y-2">
              {isSearching ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : searchResults && searchResults.results.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {searchResults.results.length} result(s) for &ldquo;{searchResults.query}&rdquo; (
                    {searchResults.source === "azure_ai_search" ? "Azure AI Search" : "local search"})
                  </p>
                  {searchResults.results.map((result) => {
                    const Icon = SEARCH_TYPE_ICONS[result.type];
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{result.title}</p>
                            <Badge variant="outline" className="capitalize">
                              {result.type}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                          )}
                          {result.snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{result.snippet}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results found for &ldquo;{searchInput}&rdquo;.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded by</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((document) => {
                        const Icon = TYPE_ICONS[document.type.toLowerCase()] ?? File;
                        const expiry = isExpiringSoon(document.expires_at);

                        return (
                          <TableRow key={document.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 text-muted-foreground" />
                                <div>
                                  <p>{document.title}</p>
                                  <p className="text-xs text-muted-foreground">{document.original_name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{CATEGORY_LABELS[document.category] ?? document.category}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatFileSize(document.size)}</TableCell>
                            <TableCell className="text-muted-foreground">{document.uploaded_by ?? "-"}</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "text-muted-foreground",
                                  expiry === "expired" && "font-medium text-destructive",
                                  expiry === "soon" && "font-medium text-chart-5"
                                )}
                              >
                                {formatDate(document.expires_at)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {document.url && (
                                    <DropdownMenuItem asChild>
                                      <a href={document.url} target="_blank" rel="noopener noreferrer">
                                        <Download className="size-4" />
                                        Download
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onSelect={() => setEditingDocument(document)}>
                                    <Pencil className="size-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  {canManage && (
                                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(document)}>
                                      <Trash2 className="size-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {meta && <DataPagination meta={meta} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={loadDocuments} />

      <EditDocumentDialog
        open={!!editingDocument}
        onOpenChange={(open) => !open && setEditingDocument(null)}
        document={editingDocument}
        onSaved={loadDocuments}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong> and its file.
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
