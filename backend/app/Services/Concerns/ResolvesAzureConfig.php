<?php

namespace App\Services\Concerns;

use App\Models\Company;
use Illuminate\Support\Facades\Crypt;

trait ResolvesAzureConfig
{
    /**
     * Resolve Azure service configuration, merging any company-level
     * overrides (stored encrypted in companies.settings.azure.<service>)
     * over the application defaults from config/services.php.
     *
     * @return array<string, mixed>
     */
    protected function azureConfig(?int $companyId, string $service): array
    {
        $config = config("services.{$service}", []);

        if ($companyId === null) {
            return $config;
        }

        $overrides = Company::find($companyId)?->settings['azure'][$service] ?? [];

        foreach ($overrides as $field => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            if ($field === 'key') {
                try {
                    $value = Crypt::decryptString($value);
                } catch (\Throwable) {
                    continue;
                }
            }

            $config[$field] = $value;
        }

        return $config;
    }
}
