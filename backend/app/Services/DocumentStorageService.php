<?php

namespace App\Services;

use App\Services\Concerns\ResolvesAzureConfig;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentStorageService
{
    use ResolvesAzureConfig;

    protected const AZURE_API_VERSION = '2021-08-06';

    /**
     * Whether Azure Blob Storage credentials are configured.
     */
    public function isAzureConfigured(?int $companyId = null): bool
    {
        $config = $this->azureConfig($companyId, 'azure_storage');

        return filled($config['account'] ?? null) && filled($config['key'] ?? null);
    }

    /**
     * The storage backend that new uploads will use.
     */
    public function disk(?int $companyId = null): string
    {
        return $this->isAzureConfigured($companyId) ? 'azure' : 'local';
    }

    /**
     * Store an uploaded file and return its relative storage path.
     */
    public function store(UploadedFile $file, string $directory = 'documents', ?int $companyId = null): string
    {
        $extension = $file->getClientOriginalExtension();
        $path = trim($directory, '/').'/'.Str::uuid().($extension ? '.'.$extension : '');

        $config = $this->azureConfig($companyId, 'azure_storage');

        if (filled($config['account'] ?? null) && filled($config['key'] ?? null)) {
            $this->putBlob($config, $path, file_get_contents($file->getRealPath()), $file->getMimeType());
        } else {
            Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));
        }

        return $path;
    }

    /**
     * Generate a URL for downloading/viewing the document.
     */
    public function url(string $path, string $disk, ?int $companyId = null): ?string
    {
        if ($disk === 'azure') {
            $config = $this->azureConfig($companyId, 'azure_storage');

            return (filled($config['account'] ?? null) && filled($config['key'] ?? null))
                ? $this->sasUrl($config, $path)
                : null;
        }

        return Storage::disk('public')->exists($path)
            ? Storage::disk('public')->url($path)
            : null;
    }

    /**
     * Delete a stored document.
     */
    public function delete(string $path, string $disk, ?int $companyId = null): void
    {
        if ($disk === 'azure') {
            $config = $this->azureConfig($companyId, 'azure_storage');

            if (filled($config['account'] ?? null) && filled($config['key'] ?? null)) {
                $this->deleteBlob($config, $path);
            }

            return;
        }

        Storage::disk('public')->delete($path);
    }

    /**
     * Test connectivity to Azure Blob Storage with the resolved configuration.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(?int $companyId = null): array
    {
        $config = $this->azureConfig($companyId, 'azure_storage');

        if (blank($config['account'] ?? null) || blank($config['key'] ?? null)) {
            return ['success' => false, 'message' => 'Azure Storage account and key are required.'];
        }

        try {
            $headers = $this->signedHeaders($config, 'GET', '', [], 0, '', ['restype' => 'container']);

            $account = $config['account'];
            $container = $config['container'];

            $response = Http::withHeaders($headers)
                ->timeout(15)
                ->get("https://{$account}.blob.core.windows.net/{$container}?restype=container");

            if ($response->successful()) {
                return ['success' => true, 'message' => 'Connected to Azure Blob Storage successfully.'];
            }

            return ['success' => false, 'message' => 'Azure Blob Storage responded with status '.$response->status().'.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Azure Blob Storage connection failed: '.$e->getMessage()];
        }
    }

    /**
     * Upload a blob to Azure Blob Storage via the REST API (Shared Key auth).
     *
     * @param  array<string, mixed>  $config
     */
    protected function putBlob(array $config, string $path, string $contents, ?string $mimeType): void
    {
        $contentType = $mimeType ?: 'application/octet-stream';

        $headers = $this->signedHeaders($config, 'PUT', $path, [
            'x-ms-blob-type' => 'BlockBlob',
        ], strlen($contents), $contentType);

        Http::withHeaders($headers)
            ->withBody($contents, $contentType)
            ->put($this->blobUrl($config, $path))
            ->throw();
    }

    /**
     * Delete a blob from Azure Blob Storage via the REST API.
     *
     * @param  array<string, mixed>  $config
     */
    protected function deleteBlob(array $config, string $path): void
    {
        $headers = $this->signedHeaders($config, 'DELETE', $path);

        Http::withHeaders($headers)->delete($this->blobUrl($config, $path));
    }

    /**
     * The base URL for a blob within the configured container.
     *
     * @param  array<string, mixed>  $config
     */
    protected function blobUrl(array $config, string $path): string
    {
        $account = $config['account'];
        $container = $config['container'];

        return "https://{$account}.blob.core.windows.net/{$container}/{$path}";
    }

    /**
     * Build Shared Key authorization headers for an Azure Blob REST request.
     *
     * @param  array<string, mixed>  $config
     * @param  array<string, string>  $extraHeaders  Additional x-ms-* headers to sign and send.
     * @param  array<string, string>  $queryParams  Additional query string parameters to include in the signature.
     */
    protected function signedHeaders(array $config, string $method, string $path, array $extraHeaders = [], int $contentLength = 0, string $contentType = '', array $queryParams = []): array
    {
        $account = $config['account'];
        $key = $config['key'];
        $container = $config['container'];

        $headers = array_merge([
            'x-ms-date' => gmdate('D, d M Y H:i:s T'),
            'x-ms-version' => self::AZURE_API_VERSION,
        ], $extraHeaders);

        $canonicalizedHeaders = collect($headers)
            ->filter(fn ($value, $name) => Str::startsWith($name, 'x-ms-'))
            ->sortKeys()
            ->map(fn ($value, $name) => "{$name}:{$value}")
            ->implode("\n");

        $canonicalizedResource = "/{$account}/{$container}".($path !== '' ? "/{$path}" : '');

        if (! empty($queryParams)) {
            ksort($queryParams);

            foreach ($queryParams as $name => $value) {
                $canonicalizedResource .= "\n".strtolower($name).':'.$value;
            }
        }

        $stringToSign = implode("\n", [
            $method,
            '', // Content-Encoding
            '', // Content-Language
            $contentLength > 0 ? (string) $contentLength : '',
            '', // Content-MD5
            $contentType,
            '', // Date
            '', // If-Modified-Since
            '', // If-Match
            '', // If-None-Match
            '', // If-Unmodified-Since
            '', // Range
            $canonicalizedHeaders,
            $canonicalizedResource,
        ]);

        $signature = base64_encode(hash_hmac('sha256', $stringToSign, base64_decode($key), true));

        $headers['Authorization'] = "SharedKey {$account}:{$signature}";

        return $headers;
    }

    /**
     * Generate a read-only SAS URL for a blob, valid for one hour.
     *
     * @param  array<string, mixed>  $config
     */
    protected function sasUrl(array $config, string $path): string
    {
        $account = $config['account'];
        $key = $config['key'];
        $container = $config['container'];

        $expiry = gmdate('Y-m-d\TH:i:s\Z', now()->addHour()->getTimestamp());
        $permissions = 'r';
        $resource = 'b';

        $canonicalizedResource = "/blob/{$account}/{$container}/{$path}";

        $stringToSign = implode("\n", [
            $permissions,
            '', // signed start
            $expiry,
            $canonicalizedResource,
            '', // signed identifier
            '', // signed IP
            'https',
            self::AZURE_API_VERSION,
            $resource,
            '', // signed snapshot time
            '', // signed encryption scope
            '', // rscc
            '', // rscd
            '', // rsce
            '', // rscl
            '', // rsct
        ]);

        $signature = base64_encode(hash_hmac('sha256', $stringToSign, base64_decode($key), true));

        $query = http_build_query([
            'sv' => self::AZURE_API_VERSION,
            'sr' => $resource,
            'sp' => $permissions,
            'se' => $expiry,
            'spr' => 'https',
            'sig' => $signature,
        ]);

        return $this->blobUrl($config, $path).'?'.$query;
    }
}
