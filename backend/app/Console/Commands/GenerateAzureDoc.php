<?php

namespace App\Console\Commands;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class GenerateAzureDoc extends Command
{
    protected $signature = 'inov:generate-azure-doc';

    protected $description = 'Render the Azure connection guide (resources/views/docs/azure-setup.blade.php) to a PDF in the frontend public docs folder.';

    public function handle(): int
    {
        $pdf = Pdf::loadView('docs.azure-setup')->setPaper('a4');

        $path = base_path('../frontend/public/docs/guide-configuration-azure.pdf');
        File::ensureDirectoryExists(dirname($path));
        $pdf->save($path);

        $this->info("Azure setup guide written to {$path}");

        return self::SUCCESS;
    }
}
