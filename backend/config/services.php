<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'azure_openai' => [
        'endpoint' => env('AZURE_OPENAI_ENDPOINT'),
        'key' => env('AZURE_OPENAI_KEY'),
        'deployment' => env('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-mini'),
        'api_version' => env('AZURE_OPENAI_API_VERSION', '2024-08-01-preview'),
    ],

    'azure_search' => [
        'endpoint' => env('AZURE_SEARCH_ENDPOINT'),
        'key' => env('AZURE_SEARCH_KEY'),
        'index' => env('AZURE_SEARCH_INDEX', 'inov-documents'),
        'api_version' => env('AZURE_SEARCH_API_VERSION', '2024-07-01'),
    ],

    'azure_storage' => [
        'account' => env('AZURE_STORAGE_ACCOUNT'),
        'key' => env('AZURE_STORAGE_KEY'),
        'container' => env('AZURE_STORAGE_CONTAINER', 'documents'),
    ],

];
