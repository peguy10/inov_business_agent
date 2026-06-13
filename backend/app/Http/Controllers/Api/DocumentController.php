<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Document\StoreDocumentRequest;
use App\Http\Requests\Document\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Services\AzureSearchService;
use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentStorageService $storage,
        protected AzureSearchService $search,
    ) {
    }

    /**
     * List documents, optionally filtered by category or search term.
     */
    public function index(Request $request): JsonResponse
    {
        $documents = Document::query()
            ->with('uploader')
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';

                $query->where(function ($query) use ($term) {
                    $query->where('title', 'like', $term)
                        ->orWhere('original_name', 'like', $term);
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'documents' => DocumentResource::collection($documents->items()),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
            ],
        ]);
    }

    /**
     * Upload a new document.
     */
    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $companyId = $request->user()->company_id;
        $path = $this->storage->store($file, 'documents', $companyId);

        $document = Document::create([
            'uploaded_by' => $request->user()->id,
            'title' => $request->input('title') ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'disk' => $this->storage->disk($companyId),
            'type' => $file->getClientOriginalExtension(),
            'category' => $request->input('category', 'general'),
            'size' => $file->getSize(),
            'expires_at' => $request->input('expires_at'),
        ]);

        $this->search->indexDocument($document);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'document' => new DocumentResource($document->load('uploader')),
        ], 201);
    }

    /**
     * Show a single document.
     */
    public function show(Document $document): JsonResponse
    {
        return response()->json([
            'document' => new DocumentResource($document->load('uploader')),
        ]);
    }

    /**
     * Update a document's title, category, or expiry date.
     */
    public function update(UpdateDocumentRequest $request, Document $document): JsonResponse
    {
        $document->update($request->validated());

        return response()->json([
            'message' => 'Document updated successfully.',
            'document' => new DocumentResource($document->fresh('uploader')),
        ]);
    }

    /**
     * Delete a document and its underlying file.
     */
    public function destroy(Document $document): JsonResponse
    {
        $this->storage->delete($document->path, $document->disk, $document->company_id);
        $this->search->removeDocument($document->id, $document->company_id);
        $document->delete();

        return response()->json(['message' => 'Document deleted successfully.']);
    }
}
