<?php

namespace App\Http\Requests\Invoice;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_id' => [
                'required',
                'integer',
                Rule::exists((new Customer)->getTable(), 'id'),
                function ($attribute, $value, $fail) {
                    if (! Customer::find($value)) {
                        $fail('The selected customer does not belong to your company.');
                    }
                },
            ],
            'invoice_number' => ['nullable', 'string', 'max:50', 'unique:invoices,invoice_number'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'issued_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issued_date'],
            'status' => ['nullable', 'in:pending,paid,overdue'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
