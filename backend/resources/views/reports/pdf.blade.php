<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ ucfirst($report->type) }} Report</title>
    <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; font-size: 12px; }
        h1 { font-size: 20px; margin-bottom: 0; color: #0F172A; }
        h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; color: #2563EB; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .meta { color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        th { background-color: #f1f5f9; color: #0F172A; }
        .summary { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; line-height: 1.6; }
        .stat-grid { width: 100%; }
        .stat-grid td { width: 25%; text-align: center; padding: 10px; }
        .stat-value { font-size: 16px; font-weight: bold; color: #2563EB; }
        .stat-label { color: #64748b; font-size: 10px; text-transform: uppercase; }
    </style>
</head>
<body>
    <h1>{{ $company->name ?? 'Company' }} &mdash; {{ ucfirst($report->type) }} Report</h1>
    <div class="meta">
        Period: {{ $report->period_start?->toFormattedDateString() }} &ndash; {{ $report->period_end?->toFormattedDateString() }}<br>
        Generated: {{ $report->created_at?->toFormattedDateString() }}
    </div>

    <h2>Executive Summary</h2>
    <div class="summary">{{ $report->ai_summary }}</div>

    <h2>Revenue</h2>
    <table class="stat-grid">
        <tr>
            <td>
                <div class="stat-value">{{ number_format($report->data['revenue']['total_collected'] ?? 0, 2) }}</div>
                <div class="stat-label">Total Collected</div>
            </td>
            <td>
                <div class="stat-value">{{ $report->data['revenue']['invoices_issued_count'] ?? 0 }}</div>
                <div class="stat-label">Invoices Issued</div>
            </td>
            <td>
                <div class="stat-value">{{ number_format($report->data['revenue']['invoices_issued_total'] ?? 0, 2) }}</div>
                <div class="stat-label">Invoiced Amount</div>
            </td>
            <td>
                <div class="stat-value">{{ $report->data['customers']['new'] ?? 0 }}</div>
                <div class="stat-label">New Customers</div>
            </td>
        </tr>
    </table>

    <h2>Outstanding Receivables</h2>
    <table class="stat-grid">
        <tr>
            <td>
                <div class="stat-value">{{ number_format($report->data['outstanding']['total'] ?? 0, 2) }}</div>
                <div class="stat-label">Total Outstanding</div>
            </td>
            <td>
                <div class="stat-value">{{ $report->data['outstanding']['count'] ?? 0 }}</div>
                <div class="stat-label">Open Invoices</div>
            </td>
            <td>
                <div class="stat-value">{{ number_format($report->data['outstanding']['overdue_total'] ?? 0, 2) }}</div>
                <div class="stat-label">Overdue Amount</div>
            </td>
            <td>
                <div class="stat-value">{{ $report->data['outstanding']['overdue_count'] ?? 0 }}</div>
                <div class="stat-label">Overdue Invoices</div>
            </td>
        </tr>
    </table>

    @if (! empty($report->data['customers']['top']))
        <h2>Top Customers (by payments received)</h2>
        <table>
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report->data['customers']['top'] as $customer)
                    <tr>
                        <td>{{ $customer['name'] }}</td>
                        <td>{{ number_format($customer['amount'], 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
