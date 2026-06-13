import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { AnimatedBackground } from "@/components/animations/animated-background";
import { BlurText } from "@/components/animations/blur-text";
import { PageTransition } from "@/components/animations/page-transition";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-1">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1e1b4b] p-10 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(139,92,246,0.25),_transparent_55%)]" />
        <AnimatedBackground />

        <div className="relative z-10 flex items-center gap-2 text-foreground">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">INOV Business Agent</span>
        </div>

        <div className="relative z-10 space-y-4">
          <BlurText
            text="Your AI COO for small & medium businesses"
            className="max-w-md text-4xl font-semibold tracking-tight text-foreground"
          />
          <p className="max-w-md text-base text-muted-foreground">
            Track revenue, invoices, payments and documents, get AI-powered insights, and
            forecast your cash flow &mdash; all in one Copilot-inspired workspace.
          </p>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          Built for the Microsoft Agents League Hackathon &mdash; Enterprise Agents.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
