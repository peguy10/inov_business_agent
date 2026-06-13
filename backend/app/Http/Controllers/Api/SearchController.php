<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AzureSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(protected AzureSearchService $search)
    {
    }

    /**
     * Search across documents, customers, and invoices for the company.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:255'],
            'type' => ['nullable', 'in:document,customer,invoice'],
        ]);

        $results = $this->search->search(
            $request->string('q')->toString(),
            $request->user()->company_id,
            $request->input('type'),
        );

        return response()->json([
            'query' => $request->string('q'),
            'source' => $this->search->isConfigured($request->user()->company_id) ? 'azure_ai_search' : 'local',
            'results' => $results,
        ]);
    }
}
