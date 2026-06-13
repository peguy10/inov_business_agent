<?php

namespace App\Http\Resources;

use App\Services\AzureOpenAIService;
use App\Services\AzureSearchService;
use App\Services\DocumentStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo' => $this->logo ? asset('storage/'.$this->logo) : null,
            'industry' => $this->industry,
            'settings' => collect($this->settings ?? [])->except('azure')->all(),
            'integrations' => $this->integrations(),
            'created_at' => $this->created_at,
        ];
    }

    /**
     * Non-secret Azure integration settings and configured status, per service.
     *
     * @return array<string, mixed>
     */
    protected function integrations(): array
    {
        $azure = $this->settings['azure'] ?? [];

        return [
            'azure_openai' => [
                'endpoint' => $azure['azure_openai']['endpoint'] ?? null,
                'deployment' => $azure['azure_openai']['deployment'] ?? null,
                'api_version' => $azure['azure_openai']['api_version'] ?? null,
                'has_key' => filled($azure['azure_openai']['key'] ?? null),
                'configured' => app(AzureOpenAIService::class)->isConfigured($this->id),
            ],
            'azure_search' => [
                'endpoint' => $azure['azure_search']['endpoint'] ?? null,
                'index' => $azure['azure_search']['index'] ?? null,
                'api_version' => $azure['azure_search']['api_version'] ?? null,
                'has_key' => filled($azure['azure_search']['key'] ?? null),
                'configured' => app(AzureSearchService::class)->isConfigured($this->id),
            ],
            'azure_storage' => [
                'account' => $azure['azure_storage']['account'] ?? null,
                'container' => $azure['azure_storage']['container'] ?? null,
                'has_key' => filled($azure['azure_storage']['key'] ?? null),
                'configured' => app(DocumentStorageService::class)->isAzureConfigured($this->id),
            ],
        ];
    }
}
