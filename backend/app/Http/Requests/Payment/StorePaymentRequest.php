<?php

namespace App\Http\Requests\Payment;

use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
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
            'invoice_id' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) {
                    if (! Invoice::find($value)) {
                        $fail('The selected invoice does not belong to your company.');
                    }
                },
            ],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'method' => ['nullable', 'string', 'max:50'],
        ];
    }
}
