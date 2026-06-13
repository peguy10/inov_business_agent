import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { CountUp } from "@/components/animations/count-up";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  changePct?: number;
  subtitle?: string;
  countUp?: {
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
}

export function StatCard({ title, value, icon, changePct, subtitle, countUp }: StatCardProps) {
  const isPositive = (changePct ?? 0) >= 0;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight">
          {countUp ? (
            <CountUp
              value={countUp.value}
              decimals={countUp.decimals}
              prefix={countUp.prefix}
              suffix={countUp.suffix}
            />
          ) : (
            value
          )}
        </div>
        {(changePct !== undefined || subtitle) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {changePct !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  isPositive ? "text-chart-4" : "text-destructive"
                )}
              >
                {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {formatPercent(changePct)}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
