<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\Company;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Payment;
use Closure;
use Illuminate\Console\Command;

class CheckAlerts extends Command
{
    protected $signature = 'inov:check-alerts';

    protected $description = 'Scan every company for overdue invoices, revenue drops, and expiring documents, refreshing smart alerts.';

    public function handle(): int
    {
        Company::query()->each(function (Company $company) {
            $this->checkOverdueInvoices($company);
            $this->checkRevenueDrop($company);
            $this->checkExpiringDocuments($company);
            $this->checkMissingContracts($company);
        });

        $this->info('Smart alerts refreshed.');

        return self::SUCCESS;
    }

    protected function checkOverdueInvoices(Company $company): void
    {
        $overdue = Invoice::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('status', 'overdue')
            ->get();

        $this->replaceAlert($company, 'overdue_invoices', function () use ($overdue) {
            if ($overdue->isEmpty()) {
                return null;
            }

            return [
                'severity' => 'critical',
                'message' => sprintf(
                    '%d invoice(s) are overdue, totaling %s in unpaid balances.',
                    $overdue->count(),
                    number_format((float) $overdue->sum('outstanding_amount'), 2)
                ),
            ];
        });
    }

    protected function checkRevenueDrop(Company $company): void
    {
        $now = now();
        $lastMonth = $now->copy()->subMonthNoOverflow();

        $thisMonthTotal = (float) Payment::query()
            ->whereHas('invoice', fn ($query) => $query->withoutGlobalScopes()->where('company_id', $company->id))
            ->whereYear('payment_date', $now->year)
            ->whereMonth('payment_date', $now->month)
            ->sum('amount');

        $lastMonthTotal = (float) Payment::query()
            ->whereHas('invoice', fn ($query) => $query->withoutGlobalScopes()->where('company_id', $company->id))
            ->whereYear('payment_date', $lastMonth->year)
            ->whereMonth('payment_date', $lastMonth->month)
            ->sum('amount');

        $this->replaceAlert($company, 'revenue_drop', function () use ($thisMonthTotal, $lastMonthTotal, $now) {
            if ($lastMonthTotal <= 0 || $now->day < 7) {
                return null;
            }

            $change = (($thisMonthTotal - $lastMonthTotal) / $lastMonthTotal) * 100;

            if ($change >= -20) {
                return null;
            }

            return [
                'severity' => 'warning',
                'message' => sprintf(
                    'Revenue this month is down %s%% compared to last month (%s vs %s).',
                    number_format(abs($change), 1),
                    number_format($thisMonthTotal, 2),
                    number_format($lastMonthTotal, 2)
                ),
            ];
        });
    }

    protected function checkExpiringDocuments(Company $company): void
    {
        $upcoming = Document::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->get();

        $this->replaceAlert($company, 'expiring_documents', function () use ($upcoming) {
            if ($upcoming->isEmpty()) {
                return null;
            }

            $names = $upcoming->pluck('title')->filter()->implode(', ');

            return [
                'severity' => 'warning',
                'message' => sprintf(
                    '%d document(s) expire within 30 days: %s.',
                    $upcoming->count(),
                    $names !== '' ? $names : 'see Documents'
                ),
            ];
        });
    }

    protected function checkMissingContracts(Company $company): void
    {
        $hasContract = Document::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('category', 'contract')
            ->exists();

        $this->replaceAlert($company, 'missing_contracts', function () use ($hasContract) {
            if ($hasContract) {
                return null;
            }

            return [
                'severity' => 'info',
                'message' => 'No contract documents on file. Upload key contracts to enable AI-powered search and expiry tracking.',
            ];
        });
    }

    /**
     * Drop any unread alert of the given type for the company, then recreate it
     * if the resolver returns details, keeping alerts current rather than duplicating.
     *
     * @param  Closure(): (array{severity: string, message: string}|null)  $resolver
     */
    protected function replaceAlert(Company $company, string $type, Closure $resolver): void
    {
        Alert::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('type', $type)
            ->where('is_read', false)
            ->delete();

        $details = $resolver();

        if ($details === null) {
            return;
        }

        Alert::create([
            'company_id' => $company->id,
            'type' => $type,
            'severity' => $details['severity'],
            'message' => $details['message'],
            'is_read' => false,
        ]);
    }
}
