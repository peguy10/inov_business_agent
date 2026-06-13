<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Requests\Invoice\UpdateInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    /**
     * List invoices, optionally filtered by status, customer, or search term.
     */
    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::query()
            ->with('customer')
            ->withSum('payments', 'amount')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->integer('customer_id')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';

                $query->where(function ($query) use ($term) {
                    $query->where('invoice_number', 'like', $term)
                        ->orWhereHas('customer', fn ($query) => $query->where('name', 'like', $term));
                });
            })
            ->orderByDesc('issued_date')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'invoices' => InvoiceResource::collection($invoices->items()),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }

    /**
     * Create a new invoice.
     */
    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['invoice_number'] = $data['invoice_number'] ?? $this->generateInvoiceNumber();
        $data['status'] = $data['status'] ?? 'pending';

        $invoice = Invoice::create($data);
        $invoice->refreshStatus();

        return response()->json([
            'message' => 'Invoice created successfully.',
            'invoice' => new InvoiceResource($invoice->load('customer', 'payments')),
        ], 201);
    }

    /**
     * Show a single invoice with its payment history.
     */
    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json([
            'invoice' => new InvoiceResource($invoice->load('customer', 'payments')),
        ]);
    }

    /**
     * Update an invoice.
     */
    public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        $invoice->update($request->validated());

        if (! $request->has('status')) {
            $invoice->refreshStatus();
        }

        return response()->json([
            'message' => 'Invoice updated successfully.',
            'invoice' => new InvoiceResource($invoice->fresh(['customer', 'payments'])),
        ]);
    }

    /**
     * Delete an invoice.
     */
    public function destroy(Invoice $invoice): JsonResponse
    {
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully.']);
    }

    /**
     * Mark an invoice as fully paid by recording a payment for the outstanding balance.
     */
    public function markPaid(Request $request, Invoice $invoice): JsonResponse
    {
        $request->validate([
            'method' => ['nullable', 'string', 'max:50'],
            'payment_date' => ['nullable', 'date'],
        ]);

        if ($invoice->outstanding_amount > 0) {
            Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $invoice->outstanding_amount,
                'payment_date' => $request->date('payment_date') ?? now()->toDateString(),
                'method' => $request->input('method', 'bank_transfer'),
            ]);
        }

        $invoice->refreshStatus();

        return response()->json([
            'message' => 'Invoice marked as paid.',
            'invoice' => new InvoiceResource($invoice->fresh(['customer', 'payments'])),
        ]);
    }

    /**
     * Generate a unique, human-friendly invoice number.
     */
    protected function generateInvoiceNumber(): string
    {
        do {
            $candidate = 'INV-'.now()->format('Ymd').'-'.Str::upper(Str::random(4));
        } while (Invoice::withoutGlobalScopes()->where('invoice_number', $candidate)->exists());

        return $candidate;
    }
}
