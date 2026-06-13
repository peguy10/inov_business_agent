<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * List customers, optionally filtered by a search term.
     */
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::query()
            ->withCount('invoices')
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';

                $query->where(function ($query) use ($term) {
                    $query->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('phone', 'like', $term);
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'customers' => CustomerResource::collection($customers->items()),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    /**
     * Create a new customer.
     */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::create($request->validated());

        return response()->json([
            'message' => 'Customer created successfully.',
            'customer' => new CustomerResource($customer),
        ], 201);
    }

    /**
     * Show a single customer with their invoices.
     */
    public function show(Customer $customer): JsonResponse
    {
        $customer->load(['invoices' => function ($query) {
            $query->latest('issued_date');
        }])->loadCount('invoices');

        return response()->json([
            'customer' => new CustomerResource($customer),
            'invoices' => \App\Http\Resources\InvoiceResource::collection($customer->invoices),
        ]);
    }

    /**
     * Update a customer.
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());

        return response()->json([
            'message' => 'Customer updated successfully.',
            'customer' => new CustomerResource($customer->fresh()),
        ]);
    }

    /**
     * Delete a customer.
     */
    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully.']);
    }
}
