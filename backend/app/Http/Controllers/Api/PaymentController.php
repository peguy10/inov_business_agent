<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * List payments, optionally filtered by invoice.
     */
    public function index(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->whereHas('invoice')
            ->with('invoice.customer')
            ->when($request->filled('invoice_id'), fn ($query) => $query->where('invoice_id', $request->integer('invoice_id')))
            ->orderByDesc('payment_date')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'payments' => PaymentResource::collection($payments->items()),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Record a new payment against an invoice.
     */
    public function store(StorePaymentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['method'] = $data['method'] ?? 'bank_transfer';

        $payment = Payment::create($data);

        $invoice = Invoice::find($data['invoice_id']);
        $invoice->refreshStatus();

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => new PaymentResource($payment->load('invoice.customer')),
        ], 201);
    }

    /**
     * Show a single payment.
     */
    public function show(Payment $payment): JsonResponse
    {
        if (! $payment->invoice) {
            abort(404);
        }

        return response()->json([
            'payment' => new PaymentResource($payment->load('invoice.customer')),
        ]);
    }

    /**
     * Delete a payment and refresh the related invoice's status.
     */
    public function destroy(Payment $payment): JsonResponse
    {
        $invoice = $payment->invoice;

        if (! $invoice) {
            abort(404);
        }

        $payment->delete();
        $invoice->refreshStatus();

        return response()->json(['message' => 'Payment deleted successfully.']);
    }
}
