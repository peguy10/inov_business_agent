<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Document;
use App\Models\Invoice;
use App\Services\Concerns\ResolvesAzureConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AzureSearchService
{
    use ResolvesAzureConfig;

    /**
     * Whether Azure AI Search credentials are configured.
     */
    public function isConfigured(?int $companyId = null): bool
    {
        $config = $this->azureConfig($companyId, 'azure_search');

        return filled($config['endpoint'] ?? null) && filled($config['key'] ?? null);
    }

    /**
     * Search documents/customers/invoices for the given company.
     *
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, int $companyId, ?string $type = null): array
    {
        $config = $this->azureConfig($companyId, 'azure_search');

        if (filled($config['endpoint'] ?? null) && filled($config['key'] ?? null)) {
            try {
                return $this->searchAzure($config, $query, $companyId, $type);
            } catch (\Throwable $e) {
                Log::warning('Azure AI Search query failed, falling back to local search.', ['error' => $e->getMessage()]);
            }
        }

        return $this->searchLocal($query, $type);
    }

    /**
     * Push a document into the Azure AI Search index (no-op if not configured).
     */
    public function indexDocument(Document $document): void
    {
        $config = $this->azureConfig($document->company_id, 'azure_search');

        if (blank($config['endpoint'] ?? null) || blank($config['key'] ?? null)) {
            return;
        }

        try {
            $this->ensureIndex($config);
            $this->upload($config, [[
                '@search.action' => 'mergeOrUpload',
                'id' => 'document-'.$document->id,
                'company_id' => $document->company_id,
                'type' => 'document',
                'title' => $document->title,
                'content' => trim($document->original_name.' '.$document->category),
                'category' => $document->category,
                'created_at' => $document->created_at?->toAtomString(),
            ]]);
        } catch (\Throwable $e) {
            Log::warning('Azure AI Search indexing failed.', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Remove a document from the Azure AI Search index (no-op if not configured).
     */
    public function removeDocument(int $documentId, ?int $companyId = null): void
    {
        $config = $this->azureConfig($companyId, 'azure_search');

        if (blank($config['endpoint'] ?? null) || blank($config['key'] ?? null)) {
            return;
        }

        try {
            $this->upload($config, [[
                '@search.action' => 'delete',
                'id' => 'document-'.$documentId,
            ]]);
        } catch (\Throwable $e) {
            Log::warning('Azure AI Search delete failed.', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Test connectivity to Azure AI Search with the resolved configuration.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(?int $companyId = null): array
    {
        $config = $this->azureConfig($companyId, 'azure_search');

        if (blank($config['endpoint'] ?? null) || blank($config['key'] ?? null)) {
            return ['success' => false, 'message' => 'Azure AI Search endpoint and key are required.'];
        }

        try {
            $endpoint = rtrim($config['endpoint'], '/');
            $version = $config['api_version'];

            $response = Http::withHeaders(['api-key' => $config['key']])
                ->timeout(15)
                ->get("{$endpoint}/indexes?api-version={$version}&\$select=name");

            if ($response->successful()) {
                return ['success' => true, 'message' => 'Connected to Azure AI Search successfully.'];
            }

            return ['success' => false, 'message' => 'Azure AI Search responded with status '.$response->status().'.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Azure AI Search connection failed: '.$e->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<int, array<string, mixed>>
     */
    protected function searchAzure(array $config, string $query, int $companyId, ?string $type): array
    {
        $filter = "company_id eq {$companyId}";

        if ($type) {
            $filter .= " and type eq '{$type}'";
        }

        $response = Http::withHeaders([
            'api-key' => $config['key'],
            'Content-Type' => 'application/json',
        ])->post($this->indexUrl($config, 'docs/search'), [
            'search' => $query,
            'filter' => $filter,
            'top' => 20,
        ])->throw()->json();

        return collect($response['value'] ?? [])->map(fn ($item) => [
            'id' => $item['id'] ?? null,
            'type' => $item['type'] ?? 'document',
            'title' => $item['title'] ?? null,
            'subtitle' => $item['category'] ?? null,
            'snippet' => $item['content'] ?? null,
            'score' => $item['@search.score'] ?? null,
        ])->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function searchLocal(string $query, ?string $type): array
    {
        $term = '%'.$query.'%';
        $results = [];

        if (! $type || $type === 'document') {
            $documents = Document::query()
                ->where(function ($q) use ($term) {
                    $q->where('title', 'like', $term)
                        ->orWhere('original_name', 'like', $term)
                        ->orWhere('category', 'like', $term);
                })
                ->latest()
                ->limit(10)
                ->get();

            foreach ($documents as $document) {
                $results[] = [
                    'id' => $document->id,
                    'type' => 'document',
                    'title' => $document->title,
                    'subtitle' => $document->category,
                    'snippet' => $document->original_name,
                    'score' => null,
                ];
            }
        }

        if (! $type || $type === 'customer') {
            $customers = Customer::query()
                ->where(function ($q) use ($term) {
                    $q->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('phone', 'like', $term);
                })
                ->limit(10)
                ->get();

            foreach ($customers as $customer) {
                $results[] = [
                    'id' => $customer->id,
                    'type' => 'customer',
                    'title' => $customer->name,
                    'subtitle' => $customer->email,
                    'snippet' => $customer->phone,
                    'score' => null,
                ];
            }
        }

        if (! $type || $type === 'invoice') {
            $invoices = Invoice::query()
                ->with('customer')
                ->where(function ($q) use ($term) {
                    $q->where('invoice_number', 'like', $term)
                        ->orWhere('description', 'like', $term)
                        ->orWhereHas('customer', fn ($q) => $q->where('name', 'like', $term));
                })
                ->limit(10)
                ->get();

            foreach ($invoices as $invoice) {
                $results[] = [
                    'id' => $invoice->id,
                    'type' => 'invoice',
                    'title' => $invoice->invoice_number,
                    'subtitle' => $invoice->customer?->name,
                    'snippet' => $invoice->description,
                    'score' => null,
                ];
            }
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<int, array<string, mixed>>  $documents
     */
    protected function upload(array $config, array $documents): void
    {
        Http::withHeaders([
            'api-key' => $config['key'],
            'Content-Type' => 'application/json',
        ])->post($this->indexUrl($config, 'docs/index'), ['value' => $documents])->throw();
    }

    /**
     * Create the search index if it does not already exist.
     *
     * @param  array<string, mixed>  $config
     */
    protected function ensureIndex(array $config): void
    {
        $endpoint = rtrim($config['endpoint'], '/');
        $index = $config['index'];
        $version = $config['api_version'];

        $exists = Http::withHeaders(['api-key' => $config['key']])
            ->get("{$endpoint}/indexes/{$index}?api-version={$version}")
            ->successful();

        if ($exists) {
            return;
        }

        Http::withHeaders([
            'api-key' => $config['key'],
            'Content-Type' => 'application/json',
        ])->put("{$endpoint}/indexes/{$index}?api-version={$version}", [
            'name' => $index,
            'fields' => [
                ['name' => 'id', 'type' => 'Edm.String', 'key' => true, 'searchable' => false],
                ['name' => 'company_id', 'type' => 'Edm.Int32', 'filterable' => true],
                ['name' => 'type', 'type' => 'Edm.String', 'filterable' => true],
                ['name' => 'title', 'type' => 'Edm.String', 'searchable' => true],
                ['name' => 'content', 'type' => 'Edm.String', 'searchable' => true],
                ['name' => 'category', 'type' => 'Edm.String', 'filterable' => true, 'searchable' => true],
                ['name' => 'created_at', 'type' => 'Edm.DateTimeOffset', 'filterable' => true, 'sortable' => true],
            ],
        ])->throw();
    }

    /**
     * @param  array<string, mixed>  $config
     */
    protected function indexUrl(array $config, string $path): string
    {
        $endpoint = rtrim($config['endpoint'], '/');
        $index = $config['index'];
        $version = $config['api_version'];

        return "{$endpoint}/indexes/{$index}/{$path}?api-version={$version}";
    }
}
