<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;

class ForecastService
{
    public function __construct(protected AzureOpenAIService $openai)
    {
    }

    /**
     * Build a cash flow forecast for the authenticated company.
     *
     * @return array<string, mixed>
     */
    public function forecast(int $companyId, int $months = 3): array
    {
        $history = $this->historicalInflow(6);
        $projection = $this->projectInflow($history, $months);
        $risks = $this->identifyRisks();

        return [
            'history' => $history,
            'projection' => $projection,
            'risks' => $risks,
            'narrative' => $this->narrative($history, $projection, $risks, $companyId),
        ];
    }

    /**
     * Monthly totals of payments received over the last N months (oldest first).
     *
     * @return array<int, array{month: string, amount: float}>
     */
    protected function historicalInflow(int $months): array
    {
        $start = now()->subMonths($months - 1)->startOfMonth();

        $totals = Payment::query()
            ->whereHas('invoice')
            ->where('payment_date', '>=', $start->toDateString())
            ->selectRaw("DATE_FORMAT(payment_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->pluck('total', 'period');

        $result = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $period = now()->subMonths($i);
            $key = $period->format('Y-m');

            $result[] = [
                'month' => $period->format('M Y'),
                'amount' => round((float) ($totals[$key] ?? 0), 2),
            ];
        }

        return $result;
    }

    /**
     * Project future monthly inflow using a weighted moving average of recent history.
     *
     * @param  array<int, array{month: string, amount: float}>  $history
     * @return array<int, array{month: string, projected_amount: float, expected_from_due_invoices: float}>
     */
    protected function projectInflow(array $history, int $months): array
    {
        $recent = array_slice(array_column($history, 'amount'), -3);
        $weights = array_slice([1, 2, 3], -count($recent));

        $weightedSum = 0;
        $weightTotal = 0;

        foreach ($recent as $index => $amount) {
            $weightedSum += $amount * $weights[$index];
            $weightTotal += $weights[$index];
        }

        $baseline = $weightTotal > 0 ? $weightedSum / $weightTotal : 0;

        $dueByMonth = $this->outstandingDueByMonth($months);

        $projection = [];

        for ($i = 1; $i <= $months; $i++) {
            $period = now()->addMonths($i);
            $key = $period->format('Y-m');

            $projection[] = [
                'month' => $period->format('M Y'),
                'projected_amount' => round($baseline, 2),
                'expected_from_due_invoices' => round($dueByMonth[$key] ?? 0, 2),
            ];
        }

        return $projection;
    }

    /**
     * Outstanding (unpaid) invoice amounts grouped by their due month.
     *
     * @return array<string, float>
     */
    protected function outstandingDueByMonth(int $months): array
    {
        $end = now()->addMonths($months)->endOfMonth();

        return Invoice::query()
            ->where('status', '!=', 'paid')
            ->where('due_date', '<=', $end)
            ->get()
            ->groupBy(fn (Invoice $invoice) => $invoice->due_date->format('Y-m'))
            ->map(fn ($invoices) => $invoices->sum('outstanding_amount'))
            ->all();
    }

    /**
     * Identify cash flow risks based on overdue and soon-due invoices.
     *
     * @return array<int, array{severity: string, message: string}>
     */
    protected function identifyRisks(): array
    {
        $risks = [];

        $overdue = Invoice::query()->where('status', 'overdue')->get();

        if ($overdue->isNotEmpty()) {
            $risks[] = [
                'severity' => 'critical',
                'message' => sprintf(
                    '%d overdue invoice(s) totaling %s remain unpaid. Follow up with these customers to protect near-term cash flow.',
                    $overdue->count(),
                    number_format($overdue->sum('outstanding_amount'), 2)
                ),
            ];
        }

        $dueSoon = Invoice::query()
            ->where('status', 'pending')
            ->whereBetween('due_date', [now()->toDateString(), now()->addDays(7)->toDateString()])
            ->get();

        if ($dueSoon->isNotEmpty()) {
            $risks[] = [
                'severity' => 'warning',
                'message' => sprintf(
                    '%d invoice(s) totaling %s are due within the next 7 days.',
                    $dueSoon->count(),
                    number_format($dueSoon->sum('outstanding_amount'), 2)
                ),
            ];
        }

        return $risks;
    }

    /**
     * Build a natural-language summary of the forecast, using Azure OpenAI when configured.
     *
     * @param  array<int, array{month: string, amount: float}>  $history
     * @param  array<int, array{month: string, projected_amount: float, expected_from_due_invoices: float}>  $projection
     * @param  array<int, array{severity: string, message: string}>  $risks
     */
    protected function narrative(array $history, array $projection, array $risks, ?int $companyId = null): string
    {
        $ai = $this->openai->chat([
            ['role' => 'system', 'content' => 'You are a financial analyst assistant for a small business. Write a concise (3-5 sentence) cash flow forecast summary with one actionable recommendation, based on the structured data provided. Use plain language suitable for a business owner.'],
            ['role' => 'user', 'content' => json_encode([
                'historical_monthly_inflow' => $history,
                'projection' => $projection,
                'risks' => $risks,
            ])],
        ], [], $companyId);

        return $ai ?? $this->localNarrative($history, $projection, $risks);
    }

    /**
     * @param  array<int, array{month: string, amount: float}>  $history
     * @param  array<int, array{month: string, projected_amount: float, expected_from_due_invoices: float}>  $projection
     * @param  array<int, array{severity: string, message: string}>  $risks
     */
    protected function localNarrative(array $history, array $projection, array $risks): string
    {
        $lastActual = end($history);
        $nextProjection = $projection[0] ?? null;

        $lines = [];

        if ($lastActual && $nextProjection) {
            $direction = $nextProjection['projected_amount'] >= $lastActual['amount'] ? 'increase to' : 'decrease to';

            $lines[] = sprintf(
                'Based on recent collections, monthly cash inflow is projected to %s approximately %s in %s, compared to %s in %s.',
                $direction,
                number_format($nextProjection['projected_amount'], 2),
                $nextProjection['month'],
                number_format($lastActual['amount'], 2),
                $lastActual['month']
            );
        }

        foreach ($risks as $risk) {
            $lines[] = $risk['message'];
        }

        if (empty($lines)) {
            $lines[] = 'There is not enough payment history yet to generate a meaningful forecast. Record more invoices and payments to improve accuracy.';
        }

        $lines[] = 'Recommendation: prioritize collection of overdue and soon-due invoices to keep projected cash flow on track.';

        return implode(' ', $lines);
    }
}
