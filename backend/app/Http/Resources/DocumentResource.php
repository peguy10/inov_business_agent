<?php

namespace App\Http\Resources;

use App\Services\DocumentStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'title' => $this->title,
            'original_name' => $this->original_name,
            'type' => $this->type,
            'category' => $this->category,
            'size' => $this->size,
            'expires_at' => $this->expires_at?->toDateString(),
            'url' => app(DocumentStorageService::class)->url($this->path, $this->disk, $this->company_id),
            'uploaded_by' => $this->uploader?->name,
            'created_at' => $this->created_at,
        ];
    }
}
