<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForecastController extends Controller
{
    public function __construct(protected ForecastService $forecast)
    {
    }

    /**
     * Return a cash flow forecast for the authenticated user's company.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'months' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $forecast = $this->forecast->forecast(
            $request->user()->company_id,
            $request->integer('months', 3)
        );

        return response()->json($forecast);
    }
}
