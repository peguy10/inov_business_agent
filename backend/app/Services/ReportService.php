<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Report;
use Carbon\CarbonImmutable;

class ReportService
{
    public function __construct(protected AzureOpenAIService $openai)
    {
    }

    /**
     * Generate and persist a business report for the given period.
     */
    public function generate(int $companyId, int $userId, string $type, ?string $periodStart = null, ?string $periodEnd = null): Report
    {
        [$start, $end] = $this->resolvePeriod($type, $periodStart, $periodEnd);

        $data = $this->buildData($start, $end);

        return Report::create([
            'company_id' => $companyId,
            'generated_by' => $userId,
            'type' => $type,
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'data' => $data,
            'ai_summary' => $this->summary($type, $start, $end, $data, $companyId),
            'format' => 'html',
        ]);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    protected function resolvePeriod(string $type, ?string $start, ?string $end): array
    {
        if ($start && $end) {
            return [CarbonImmutable::parse($start)->startOfDay(), CarbonImmutable::parse($end)->endOfDay()];
        }

        $now = CarbonImmutable::now();

        return match ($type) {
            'daily' => [$now->startOfDay(), $now->endOfDay()],
            'weekly' => [$now->startOfWeek(), $now->endOfWeek()],
            'quarterly' => [$now->startOfQuarter(), $now->endOfQuarter()],
            default => [$now->startOfMonth(), $now->endOfMonth()],
        };
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildData(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $invoicesIssued = Invoice::query()
            ->whereBetween('issued_date', [$start->toDateString(), $end->toDateString()])
            ->get();

        $paymentsReceived = Payment::query()
            ->whereHas('invoice')
            ->whereBetween('payment_date', [$start->toDateString(), $end->toDateString()])
            ->with('invoice.customer')
            ->get();

        $newCustomers = Customer::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $outstanding = Invoice::query()->where('status', '!=', 'paid')->get();

        $topCustomers = $paymentsReceived
            ->groupBy(fn (Payment $payment) => $payment->invoice->customer?->name ?? 'Unknown')
            ->map(fn ($group) => round((float) $group->sum('amount'), 2))
            ->sortDesc()
            ->take(5);

        return [
            'period' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'revenue' => [
                'total_collected' => round((float) $paymentsReceived->sum('amount'), 2),
                'invoices_issued_count' => $invoicesIssued->count(),
                'invoices_issued_total' => round((float) $invoicesIssued->sum('amount'), 2),
            ],
            'customers' => [
                'new' => $newCustomers,
                'top' => $topCustomers->map(fn ($amount, $name) => ['name' => $name, 'amount' => $amount])->values()->all(),
            ],
            'outstanding' => [
                'count' => $outstanding->count(),
                'total' => round((float) $outstanding->sum('outstanding_amount'), 2),
                'overdue_count' => $outstanding->where('status', 'overdue')->count(),
                'overdue_total' => round((float) $outstanding->where('status', 'overdue')->sum('outstanding_amount'), 2),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function summary(string $type, CarbonImmutable $start, CarbonImmutable $end, array $data, ?int $companyId = null): string
    {
        $ai = $this->openai->chat([
            [
                'role' => 'system',
                'content' => "You are a business analyst. Write a concise executive summary (4-6 sentences) of this {$type} report, "
                    .'highlighting key figures, trends, and 2-3 actionable recommendations for an SME owner.',
            ],
            ['role' => 'user', 'content' => json_encode($data)],
        ], [], $companyId);

        return $ai ?? $this->localSummary($type, $start, $end, $data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function localSummary(string $type, CarbonImmutable $start, CarbonImmutable $end, array $data): string
    {
        $lines = [];

        $lines[] = sprintf(
            'For the %s period from %s to %s, total revenue collected was %s across %d invoice(s) issued totaling %s.',
            $type,
            $start->toFormattedDateString(),
            $end->toFormattedDateString(),
            number_format($data['revenue']['total_collected'], 2),
            $data['revenue']['invoices_issued_count'],
            number_format($data['revenue']['invoices_issued_total'], 2)
        );

        $lines[] = sprintf('%d new customer(s) were acquired during this period.', $data['customers']['new']);

        $lines[] = sprintf(
            'Outstanding receivables stand at %s across %d invoice(s), of which %d (%s) are overdue.',
            number_format($data['outstanding']['total'], 2),
            $data['outstanding']['count'],
            $data['outstanding']['overdue_count'],
            number_format($data['outstanding']['overdue_total'], 2)
        );

        $lines[] = $data['outstanding']['overdue_count'] > 0
            ? 'Recommendation: prioritize follow-up on overdue invoices to improve cash flow.'
            : 'Recommendation: continue monitoring upcoming due dates to maintain healthy cash flow.';

        return implode(' ', $lines);
    }
}
