import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  paid: "border-transparent bg-chart-4/15 text-chart-4",
  pending: "border-transparent bg-chart-5/15 text-chart-5",
  overdue: "border-transparent bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}
