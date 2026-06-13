<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;

class BusinessInsightsService
{
    /**
     * Revenue collected this month, last month, and year-to-date.
     *
     * @return array<string, float>
     */
    public function revenueSummary(): array
    {
        $now = now();

        $thisMonth = Payment::query()
            ->whereHas('invoice')
            ->whereYear('payment_date', $now->year)
            ->whereMonth('payment_date', $now->month)
            ->sum('amount');

        $lastMonthDate = $now->copy()->subMonthNoOverflow();

        $lastMonth = Payment::query()
            ->whereHas('invoice')
            ->whereYear('payment_date', $lastMonthDate->year)
            ->whereMonth('payment_date', $lastMonthDate->month)
            ->sum('amount');

        $yearToDate = Payment::query()
            ->whereHas('invoice')
            ->whereYear('payment_date', $now->year)
            ->sum('amount');

        $allTime = Payment::query()->whereHas('invoice')->sum('amount');

        return [
            'this_month' => round((float) $thisMonth, 2),
            'last_month' => round((float) $lastMonth, 2),
            'year_to_date' => round((float) $yearToDate, 2),
            'all_time' => round((float) $allTime, 2),
        ];
    }

    /**
     * Outstanding and overdue invoice totals, plus the most pressing invoices.
     *
     * @return array<string, mixed>
     */
    public function unpaidInvoices(): array
    {
        $invoices = Invoice::query()
            ->where('status', '!=', 'paid')
            ->with('customer')
            ->orderBy('due_date')
            ->get();

        $overdue = $invoices->where('status', 'overdue');

        return [
            'count' => $invoices->count(),
            'total_outstanding' => round((float) $invoices->sum('outstanding_amount'), 2),
            'overdue_count' => $overdue->count(),
            'overdue_total' => round((float) $overdue->sum('outstanding_amount'), 2),
            'invoices' => $invoices->take(10)->map(fn (Invoice $invoice) => [
                'invoice_number' => $invoice->invoice_number,
                'customer' => $invoice->customer?->name,
                'amount' => (float) $invoice->amount,
                'outstanding_amount' => $invoice->outstanding_amount,
                'due_date' => $invoice->due_date?->toDateString(),
                'status' => $invoice->status,
            ])->values()->all(),
        ];
    }

    /**
     * Customer counts, including new customers acquired this month.
     *
     * @return array<string, int>
     */
    public function customerStats(): array
    {
        $now = now();

        return [
            'total' => Customer::query()->count(),
            'new_this_month' => Customer::query()
                ->whereYear('created_at', $now->year)
                ->whereMonth('created_at', $now->month)
                ->count(),
        ];
    }
}
