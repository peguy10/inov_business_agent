<?php

namespace App\Http\Requests\Invoice;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvoiceRequest extends FormRequest
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
                'sometimes',
                'required',
                'integer',
                Rule::exists((new Customer)->getTable(), 'id'),
                function ($attribute, $value, $fail) {
                    if (! Customer::find($value)) {
                        $fail('The selected customer does not belong to your company.');
                    }
                },
            ],
            'invoice_number' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('invoices', 'invoice_number')->ignore($this->route('invoice')),
            ],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'issued_date' => ['sometimes', 'required', 'date'],
            'due_date' => ['sometimes', 'required', 'date', 'after_or_equal:issued_date'],
            'status' => ['sometimes', 'required', 'in:pending,paid,overdue'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
