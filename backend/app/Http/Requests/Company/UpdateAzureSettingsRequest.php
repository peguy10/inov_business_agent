<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAzureSettingsRequest extends FormRequest
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
            'azure_openai' => ['sometimes', 'array'],
            'azure_openai.endpoint' => ['nullable', 'string', 'max:500'],
            'azure_openai.key' => ['nullable', 'string', 'max:500'],
            'azure_openai.deployment' => ['nullable', 'string', 'max:255'],
            'azure_openai.api_version' => ['nullable', 'string', 'max:50'],

            'azure_search' => ['sometimes', 'array'],
            'azure_search.endpoint' => ['nullable', 'string', 'max:500'],
            'azure_search.key' => ['nullable', 'string', 'max:500'],
            'azure_search.index' => ['nullable', 'string', 'max:255'],
            'azure_search.api_version' => ['nullable', 'string', 'max:50'],

            'azure_storage' => ['sometimes', 'array'],
            'azure_storage.account' => ['nullable', 'string', 'max:255'],
            'azure_storage.key' => ['nullable', 'string', 'max:500'],
            'azure_storage.container' => ['nullable', 'string', 'max:255'],
        ];
    }
}
