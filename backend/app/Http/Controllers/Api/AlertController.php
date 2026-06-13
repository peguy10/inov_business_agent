<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlertResource;
use App\Models\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    /**
     * List alerts for the authenticated user's company.
     */
    public function index(Request $request): JsonResponse
    {
        $alerts = Alert::query()
            ->when($request->boolean('unread_only'), fn ($query) => $query->where('is_read', false))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'alerts' => AlertResource::collection($alerts->items()),
            'meta' => [
                'current_page' => $alerts->currentPage(),
                'last_page' => $alerts->lastPage(),
                'per_page' => $alerts->perPage(),
                'total' => $alerts->total(),
            ],
            'unread_count' => Alert::query()->where('is_read', false)->count(),
        ]);
    }

    /**
     * Mark a single alert as read.
     */
    public function markRead(Alert $alert): JsonResponse
    {
        $alert->update(['is_read' => true]);

        return response()->json(['alert' => new AlertResource($alert)]);
    }

    /**
     * Mark all of the company's alerts as read.
     */
    public function markAllRead(): JsonResponse
    {
        Alert::query()->where('is_read', false)->update(['is_read' => true]);

        return response()->json(['message' => 'All alerts marked as read.']);
    }

    /**
     * Delete an alert.
     */
    public function destroy(Alert $alert): JsonResponse
    {
        $alert->delete();

        return response()->json(['message' => 'Alert deleted successfully.']);
    }
}
