<?php

require __DIR__.'/../backend/vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

function renderPdf(string $htmlFile, string $outputFile): void
{
    $html = file_get_contents(__DIR__.'/'.$htmlFile);

    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', false);
    $options->set('defaultFont', 'DejaVu Sans');

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    file_put_contents(__DIR__.'/'.$outputFile, $dompdf->output());

    echo "Genere : {$outputFile}\n";
}

renderPdf('guide-fonctionnement.html', 'INOV_Business_Agent_-_Guide_de_fonctionnement.pdf');
renderPdf('guide-utilisation-video.html', 'INOV_Business_Agent_-_Guide_Utilisation_et_Script_Video.pdf');
