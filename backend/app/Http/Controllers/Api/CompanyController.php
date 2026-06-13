<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreUserRequest;
use App\Http\Requests\Company\UpdateAzureSettingsRequest;
use App\Http\Requests\Company\UpdateCompanyRequest;
use App\Http\Requests\Company\UpdateUserRequest;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AzureOpenAIService;
use App\Services\AzureSearchService;
use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class CompanyController extends Controller
{
    public function __construct(
        protected AzureOpenAIService $openai,
        protected AzureSearchService $search,
        protected DocumentStorageService $storage,
    ) {
    }

    /**
     * Show the authenticated user's company profile.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'company' => new CompanyResource($request->user()->company),
        ]);
    }

    /**
     * Update the company profile.
     */
    public function update(UpdateCompanyRequest $request): JsonResponse
    {
        $company = $request->user()->company;

        $company->update($request->validated());

        return response()->json([
            'message' => 'Company updated successfully.',
            'company' => new CompanyResource($company->fresh()),
        ]);
    }

    /**
     * Upload (or replace) the company logo.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $company = $request->user()->company;

        if ($company->logo) {
            Storage::disk('public')->delete($company->logo);
        }

        $company->update([
            'logo' => $request->file('logo')->store('logos', 'public'),
        ]);

        return response()->json([
            'message' => 'Logo uploaded successfully.',
            'company' => new CompanyResource($company->fresh()),
        ]);
    }

    /**
     * List the team members belonging to the company.
     */
    public function users(Request $request): JsonResponse
    {
        $users = $request->user()->company->users()->orderBy('name')->get();

        return response()->json([
            'users' => UserResource::collection($users),
        ]);
    }

    /**
     * Create a new team member within the company.
     */
    public function storeUser(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'company_id' => $request->user()->company_id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
        ]);

        return response()->json([
            'message' => 'Team member created successfully.',
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * Update a team member's name or role.
     */
    public function updateUser(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorizeCompanyUser($request, $user);

        $user->update($request->validated());

        return response()->json([
            'message' => 'Team member updated successfully.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Remove a team member from the company.
     */
    public function destroyUser(Request $request, User $user): JsonResponse
    {
        $this->authorizeCompanyUser($request, $user);

        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot remove your own account.'],
            ]);
        }

        $user->delete();

        return response()->json(['message' => 'Team member removed successfully.']);
    }

    /**
     * Update the company's per-company Azure integration settings.
     */
    public function updateAzureIntegrations(UpdateAzureSettingsRequest $request): JsonResponse
    {
        $company = $request->user()->company;
        $settings = $company->settings ?? [];
        $azure = $settings['azure'] ?? [];

        foreach (['azure_openai', 'azure_search', 'azure_storage'] as $service) {
            if (! $request->has($service)) {
                continue;
            }

            $current = $azure[$service] ?? [];

            foreach ($request->input($service, []) as $field => $value) {
                if ($field === 'key') {
                    if (filled($value)) {
                        $current['key'] = Crypt::encryptString($value);
                    }

                    continue;
                }

                if ($value === null || $value === '') {
                    unset($current[$field]);

                    continue;
                }

                $current[$field] = $value;
            }

            $azure[$service] = $current;
        }

        $settings['azure'] = $azure;
        $company->update(['settings' => $settings]);

        return response()->json([
            'message' => 'Azure integration settings updated successfully.',
            'company' => new CompanyResource($company->fresh()),
        ]);
    }

    /**
     * Test connectivity for one of the company's configured Azure services.
     */
    public function testAzureIntegration(Request $request): JsonResponse
    {
        $request->validate([
            'service' => ['required', 'in:azure_openai,azure_search,azure_storage'],
        ]);

        $companyId = $request->user()->company_id;

        $result = match ($request->string('service')->toString()) {
            'azure_openai' => $this->openai->testConnection($companyId),
            'azure_search' => $this->search->testConnection($companyId),
            'azure_storage' => $this->storage->testConnection($companyId),
        };

        return response()->json($result);
    }

    /**
     * Ensure the target user belongs to the authenticated user's company.
     */
    protected function authorizeCompanyUser(Request $request, User $user): void
    {
        if ($user->company_id !== $request->user()->company_id) {
            abort(404);
        }
    }
}
