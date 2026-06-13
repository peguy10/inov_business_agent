<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    public function __construct(protected ReportService $reports)
    {
    }

    /**
     * List previously generated reports.
     */
    public function index(Request $request): JsonResponse
    {
        $reports = Report::query()
            ->with('generator')
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'reports' => ReportResource::collection($reports->items()),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    /**
     * Generate a new report for the requested period.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', 'in:daily,weekly,monthly,quarterly'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
        ]);

        $report = $this->reports->generate(
            $request->user()->company_id,
            $request->user()->id,
            $request->input('type'),
            $request->input('period_start'),
            $request->input('period_end'),
        );

        return response()->json([
            'message' => 'Report generated successfully.',
            'report' => new ReportResource($report->load('generator')),
        ], 201);
    }

    /**
     * Show a single report.
     */
    public function show(Report $report): JsonResponse
    {
        return response()->json([
            'report' => new ReportResource($report->load('generator')),
        ]);
    }

    /**
     * Delete a report.
     */
    public function destroy(Report $report): JsonResponse
    {
        $report->delete();

        return response()->json(['message' => 'Report deleted successfully.']);
    }

    /**
     * Download a report as a PDF document.
     */
    public function pdf(Request $request, Report $report): Response
    {
        $pdf = Pdf::loadView('reports.pdf', [
            'report' => $report,
            'company' => $request->user()->company,
        ]);

        return $pdf->download("report-{$report->type}-{$report->id}.pdf");
    }
}
