<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlertResource;
use App\Models\Alert;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\BusinessInsightsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(protected BusinessInsightsService $insights)
    {
    }

    /**
     * Return widget totals, chart series, and recent activity for the dashboard.
     */
    public function index(Request $request): JsonResponse
    {
        $revenue = $this->insights->revenueSummary();
        $unpaid = $this->insights->unpaidInvoices();
        $customers = $this->insights->customerStats();

        return response()->json([
            'widgets' => [
                'revenue' => [
                    'this_month' => $revenue['this_month'],
                    'last_month' => $revenue['last_month'],
                    'change_pct' => $this->percentChange($revenue['last_month'], $revenue['this_month']),
                    'year_to_date' => $revenue['year_to_date'],
                ],
                'outstanding_invoices' => [
                    'total' => $unpaid['total_outstanding'],
                    'count' => $unpaid['count'],
                    'overdue_total' => $unpaid['overdue_total'],
                    'overdue_count' => $unpaid['overdue_count'],
                ],
                'customers' => [
                    'total' => $customers['total'],
                    'new_this_month' => $customers['new_this_month'],
                ],
                'profit' => [
                    'this_month' => $revenue['this_month'],
                    'last_month' => $revenue['last_month'],
                    'change_pct' => $this->percentChange($revenue['last_month'], $revenue['this_month']),
                ],
            ],
            'charts' => [
                'revenue_trend' => $this->revenueTrend(),
                'invoice_status' => $this->invoiceStatusBreakdown(),
                'cash_flow' => $this->cashFlowTrend(),
            ],
            'alerts' => AlertResource::collection(
                Alert::query()->where('is_read', false)->latest()->take(5)->get()
            ),
            'recent_activity' => $this->recentActivity(),
        ]);
    }

    protected function percentChange(float $previous, float $current): float
    {
        if ($previous == 0.0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * @return array<int, array{month: string, amount: float}>
     */
    protected function revenueTrend(): array
    {
        $now = now();
        $start = $now->copy()->subMonthsNoOverflow(5)->startOfMonth();

        $totals = Payment::query()
            ->whereHas('invoice')
            ->where('payment_date', '>=', $start)
            ->selectRaw("DATE_FORMAT(payment_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->pluck('total', 'period');

        return $this->lastSixMonths()->map(fn (Carbon $date) => [
            'month' => $date->format('M Y'),
            'amount' => round((float) ($totals[$date->format('Y-m')] ?? 0), 2),
        ])->values()->all();
    }

    /**
     * @return array<int, array{status: string, count: int, total: float}>
     */
    protected function invoiceStatusBreakdown(): array
    {
        return Invoice::query()
            ->selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->count,
                'total' => round((float) $row->total, 2),
            ])->values()->all();
    }

    /**
     * @return array<int, array{month: string, inflow: float, outflow: float, net: float}>
     */
    protected function cashFlowTrend(): array
    {
        $now = now();
        $start = $now->copy()->subMonthsNoOverflow(5)->startOfMonth();

        $inflows = Payment::query()
            ->whereHas('invoice')
            ->where('payment_date', '>=', $start)
            ->selectRaw("DATE_FORMAT(payment_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->pluck('total', 'period');

        $outflows = Invoice::query()
            ->where('issued_date', '>=', $start)
            ->selectRaw("DATE_FORMAT(issued_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->pluck('total', 'period');

        return $this->lastSixMonths()->map(function (Carbon $date) use ($inflows, $outflows) {
            $period = $date->format('Y-m');
            $inflow = (float) ($inflows[$period] ?? 0);
            $outflow = (float) ($outflows[$period] ?? 0);

            return [
                'month' => $date->format('M Y'),
                'inflow' => round($inflow, 2),
                'outflow' => round($outflow, 2),
                'net' => round($inflow - $outflow, 2),
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array{type: string, description: string, amount: float, date: ?string}>
     */
    protected function recentActivity(): array
    {
        $invoices = Invoice::query()
            ->with('customer')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Invoice $invoice) => [
                'type' => 'invoice',
                'description' => "Invoice {$invoice->invoice_number} issued to {$invoice->customer?->name}",
                'amount' => (float) $invoice->amount,
                'date' => $invoice->created_at?->toIso8601String(),
            ]);

        $payments = Payment::query()
            ->whereHas('invoice')
            ->with('invoice.customer')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Payment $payment) => [
                'type' => 'payment',
                'description' => "Payment received from {$payment->invoice->customer?->name}",
                'amount' => (float) $payment->amount,
                'date' => $payment->created_at?->toIso8601String(),
            ]);

        return $invoices->concat($payments)
            ->sortByDesc('date')
            ->take(8)
            ->values()
            ->all();
    }

    /**
     * @return \Illuminate\Support\Collection<int, Carbon>
     */
    protected function lastSixMonths(): \Illuminate\Support\Collection
    {
        $now = now();

        return collect(range(5, 0))->map(fn (int $i) => $now->copy()->subMonthsNoOverflow($i));
    }
}
