<?php

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ForecastController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['message' => 'pong', 'time' => now()->toIso8601String()]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware('throttle:6,1');

    Route::prefix('company')->group(function () {
        Route::get('/', [CompanyController::class, 'show']);
        Route::put('/', [CompanyController::class, 'update'])->middleware('role:admin');
        Route::post('/logo', [CompanyController::class, 'uploadLogo'])->middleware('role:admin');

        Route::get('/users', [CompanyController::class, 'users'])->middleware('role:admin,manager');
        Route::post('/users', [CompanyController::class, 'storeUser'])->middleware('role:admin');
        Route::put('/users/{user}', [CompanyController::class, 'updateUser'])->middleware('role:admin');
        Route::delete('/users/{user}', [CompanyController::class, 'destroyUser'])->middleware('role:admin');

        Route::put('/integrations/azure', [CompanyController::class, 'updateAzureIntegrations'])->middleware('role:admin');
        Route::post('/integrations/azure/test', [CompanyController::class, 'testAzureIntegration'])->middleware('role:admin');
    });

    Route::apiResource('customers', CustomerController::class)->except(['destroy']);
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('role:admin,manager');

    Route::apiResource('invoices', InvoiceController::class)->except(['destroy']);
    Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy'])->middleware('role:admin,manager');
    Route::post('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid']);

    Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'show', 'destroy']);

    Route::apiResource('documents', DocumentController::class)->except(['destroy']);
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->middleware('role:admin,manager');

    Route::get('/search', [SearchController::class, 'index']);

    Route::prefix('chat')->group(function () {
        Route::get('/conversations', [ChatController::class, 'index']);
        Route::get('/conversations/{conversation}', [ChatController::class, 'show']);
        Route::delete('/conversations/{conversation}', [ChatController::class, 'destroy']);
        Route::post('/', [ChatController::class, 'send']);
    });

    Route::get('/forecast', [ForecastController::class, 'index']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::prefix('alerts')->group(function () {
        Route::get('/', [AlertController::class, 'index']);
        Route::post('/read-all', [AlertController::class, 'markAllRead']);
        Route::post('/{alert}/read', [AlertController::class, 'markRead']);
        Route::delete('/{alert}', [AlertController::class, 'destroy']);
    });

    Route::prefix('reports')->group(function () {
        Route::get('/', [ReportController::class, 'index']);
        Route::post('/', [ReportController::class, 'store']);
        Route::get('/{report}', [ReportController::class, 'show']);
        Route::delete('/{report}', [ReportController::class, 'destroy'])->middleware('role:admin,manager');
        Route::get('/{report}/pdf', [ReportController::class, 'pdf']);
    });
});
