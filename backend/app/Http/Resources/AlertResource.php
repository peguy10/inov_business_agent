<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlertResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'severity' => $this->severity,
            'message' => $this->message,
            'related_type' => $this->related_type,
            'related_id' => $this->related_id,
            'is_read' => $this->is_read,
            'created_at' => $this->created_at,
        ];
    }
}
