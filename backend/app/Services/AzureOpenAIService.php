<?php

namespace App\Services;

use App\Services\Concerns\ResolvesAzureConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AzureOpenAIService
{
    use ResolvesAzureConfig;

    /**
     * Whether Azure OpenAI credentials are configured.
     */
    public function isConfigured(?int $companyId = null): bool
    {
        $config = $this->azureConfig($companyId, 'azure_openai');

        return filled($config['endpoint'] ?? null) && filled($config['key'] ?? null);
    }

    /**
     * Send a chat completion request to Azure OpenAI.
     *
     * Returns null when not configured or when the request fails, so callers
     * can transparently fall back to a local templated response.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $options
     */
    public function chat(array $messages, array $options = [], ?int $companyId = null): ?string
    {
        $config = $this->azureConfig($companyId, 'azure_openai');

        if (blank($config['endpoint'] ?? null) || blank($config['key'] ?? null)) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'api-key' => $config['key'],
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($this->url($config), array_merge([
                'messages' => $messages,
                'temperature' => 0.3,
                'max_tokens' => 700,
            ], $options))->throw()->json();

            return $response['choices'][0]['message']['content'] ?? null;
        } catch (\Throwable $e) {
            Log::warning('Azure OpenAI request failed, using local fallback.', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Test connectivity to Azure OpenAI with the resolved configuration.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(?int $companyId = null): array
    {
        $config = $this->azureConfig($companyId, 'azure_openai');

        if (blank($config['endpoint'] ?? null) || blank($config['key'] ?? null)) {
            return ['success' => false, 'message' => 'Azure OpenAI endpoint and key are required.'];
        }

        try {
            $response = Http::withHeaders([
                'api-key' => $config['key'],
                'Content-Type' => 'application/json',
            ])->timeout(15)->post($this->url($config), [
                'messages' => [['role' => 'user', 'content' => 'ping']],
                'max_tokens' => 5,
            ]);

            if ($response->successful()) {
                return ['success' => true, 'message' => 'Connected to Azure OpenAI successfully.'];
            }

            return ['success' => false, 'message' => 'Azure OpenAI responded with status '.$response->status().'.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Azure OpenAI connection failed: '.$e->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $config
     */
    protected function url(array $config): string
    {
        $endpoint = rtrim($config['endpoint'], '/');
        $deployment = $config['deployment'];
        $version = $config['api_version'];

        return "{$endpoint}/openai/deployments/{$deployment}/chat/completions?api-version={$version}";
    }
}
