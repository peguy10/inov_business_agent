<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Services\AzureSearchService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UnitedAppartsSeeder extends Seeder
{
    protected int $invoiceSequence = 1;

    /**
     * Seed a fully populated "United Apparts" demo company.
     */
    public function run(): void
    {
        $company = Company::create([
            'name' => 'United Apparts',
            'industry' => 'Apparel Wholesale & Manufacturing',
            'settings' => [
                'currency' => 'USD',
                'timezone' => 'UTC',
            ],
        ]);

        $admin = User::create([
            'company_id' => $company->id,
            'name' => 'Amara Diallo',
            'email' => 'admin@unitedapparts.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        User::create([
            'company_id' => $company->id,
            'name' => 'Daniel Mensah',
            'email' => 'manager@unitedapparts.com',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'email_verified_at' => now(),
        ]);

        User::create([
            'company_id' => $company->id,
            'name' => 'Grace Owusu',
            'email' => 'employee@unitedapparts.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'email_verified_at' => now(),
        ]);

        $customers = $this->seedCustomers($company);
        $this->seedInvoicesAndPayments($company, $customers);
        $this->seedDocuments($company, $admin);
    }

    /**
     * @return Collection<int, Customer>
     */
    protected function seedCustomers(Company $company): Collection
    {
        $customers = [
            ['name' => 'Metro Fashion Boutique', 'email' => 'orders@metrofashion.com', 'phone' => '+1-202-555-0101', 'address' => '120 5th Ave, New York, NY'],
            ['name' => 'Style Hub Stores', 'email' => 'purchasing@stylehub.com', 'phone' => '+1-202-555-0102', 'address' => '45 Market St, Boston, MA'],
            ['name' => 'Trendy Threads Co.', 'email' => 'accounts@trendythreads.com', 'phone' => '+1-202-555-0103', 'address' => '78 Bay St, Toronto, ON'],
            ['name' => 'Urban Wardrobe Ltd.', 'email' => 'finance@urbanwardrobe.com', 'phone' => '+1-202-555-0104', 'address' => '9 King St, London, UK'],
            ['name' => 'Chic Boutique Group', 'email' => 'ap@chicboutique.com', 'phone' => '+1-202-555-0105', 'address' => '301 Rodeo Dr, Los Angeles, CA'],
            ['name' => 'Fashion Forward Inc.', 'email' => 'billing@fashionforward.com', 'phone' => '+1-202-555-0106', 'address' => '17 Queen St, Sydney, AU'],
            ['name' => 'The Clothing Loft', 'email' => 'orders@clothingloft.com', 'phone' => '+1-202-555-0107', 'address' => '88 Main St, Chicago, IL'],
            ['name' => 'Apparel Express', 'email' => 'ap@apparelexpress.com', 'phone' => '+1-202-555-0108', 'address' => '12 Harbor Rd, Miami, FL'],
            ['name' => 'Vogue Corner', 'email' => 'accounts@voguecorner.com', 'phone' => '+1-202-555-0109', 'address' => '5 Rue de Rivoli, Paris, FR'],
            ['name' => 'Streetwear Central', 'email' => 'finance@streetwearcentral.com', 'phone' => '+1-202-555-0110', 'address' => '230 Broadway, New York, NY'],
        ];

        return new Collection(array_map(
            fn (array $data) => Customer::create(array_merge($data, ['company_id' => $company->id])),
            $customers
        ));
    }

    /**
     * @param  Collection<int, Customer>  $customers
     */
    protected function seedInvoicesAndPayments(Company $company, Collection $customers): void
    {
        $now = now();

        // Five fully-elapsed months of history, mostly settled, for revenue trends.
        for ($monthsAgo = 5; $monthsAgo >= 1; $monthsAgo--) {
            $monthStart = $now->copy()->subMonthsNoOverflow($monthsAgo)->startOfMonth();

            foreach (range(1, random_int(5, 8)) as $i) {
                $issued = $monthStart->copy()->addDays(random_int(0, 20));
                $due = $issued->copy()->addDays(30);
                $amount = round(random_int(800, 15000) + (random_int(0, 99) / 100), 2);

                $invoice = $this->createInvoice($company, $customers->random(), $amount, $issued, $due);

                if (random_int(1, 100) <= 85) {
                    $this->recordPayment($invoice, $amount, $due->copy()->subDays(random_int(0, 15)));
                }

                $invoice->refreshStatus();
            }
        }

        // Current month: a mix of pending and a few already settled.
        foreach (range(1, random_int(4, 6)) as $i) {
            $issued = $now->copy()->subDays(random_int(0, 10));
            $due = $issued->copy()->addDays(30);
            $amount = round(random_int(800, 15000) + (random_int(0, 99) / 100), 2);

            $invoice = $this->createInvoice($company, $customers->random(), $amount, $issued, $due);

            if (random_int(1, 100) <= 40) {
                $this->recordPayment($invoice, $amount, $issued->copy()->addDays(random_int(0, 5)));
            }

            $invoice->refreshStatus();
        }

        // Guaranteed overdue invoices so unpaid/overdue insights have real data.
        foreach (range(1, 3) as $i) {
            $issued = $now->copy()->subDays(random_int(40, 70));
            $due = $issued->copy()->addDays(30);
            $amount = round(random_int(1000, 8000) + (random_int(0, 99) / 100), 2);

            $invoice = $this->createInvoice($company, $customers->random(), $amount, $issued, $due);

            if (random_int(0, 1) === 1) {
                $this->recordPayment($invoice, round($amount * 0.3, 2), $due->copy()->subDays(5));
            }

            $invoice->refreshStatus();
        }
    }

    protected function createInvoice(Company $company, Customer $customer, float $amount, \Illuminate\Support\Carbon $issued, \Illuminate\Support\Carbon $due): Invoice
    {
        $invoiceNumber = sprintf('INV-%s-%04d', $issued->format('Ymd'), $this->invoiceSequence++);

        return Invoice::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'invoice_number' => $invoiceNumber,
            'amount' => $amount,
            'issued_date' => $issued->toDateString(),
            'due_date' => $due->toDateString(),
            'status' => 'pending',
            'description' => 'Wholesale apparel order',
        ]);
    }

    protected function recordPayment(Invoice $invoice, float $amount, \Illuminate\Support\Carbon $paymentDate): void
    {
        Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => $amount,
            'payment_date' => $paymentDate->toDateString(),
            'method' => collect(['bank_transfer', 'card', 'cash'])->random(),
        ]);
    }

    protected function seedDocuments(Company $company, User $admin): void
    {
        $now = now();
        $search = app(AzureSearchService::class);

        $documents = [
            [
                'title' => 'Warehouse Lease Agreement',
                'category' => 'contract',
                'expires_at' => $now->copy()->addDays(18)->toDateString(),
                'html' => '<h1>Warehouse Lease Agreement</h1>'
                    .'<p>This lease agreement between United Apparts and Metro Logistics Properties covers the '
                    .'distribution warehouse at 500 Industrial Pkwy. The lease term is expiring soon and requires renewal.</p>',
            ],
            [
                'title' => 'Supplier Agreement - TextilePro Mills',
                'category' => 'contract',
                'expires_at' => $now->copy()->addMonths(8)->toDateString(),
                'html' => '<h1>Supplier Agreement</h1>'
                    .'<p>Annual fabric supply agreement between United Apparts and TextilePro Mills covering '
                    .'cotton and polyester blend textiles for the upcoming production cycles.</p>',
            ],
            [
                'title' => 'Business Operating License',
                'category' => 'legal',
                'expires_at' => $now->copy()->addYear()->toDateString(),
                'html' => '<h1>Business Operating License</h1>'
                    .'<p>State business operating license authorizing United Apparts to conduct apparel '
                    .'manufacturing and wholesale distribution operations.</p>',
            ],
            [
                'title' => 'Q1 Financial Statement',
                'category' => 'financial',
                'expires_at' => null,
                'html' => '<h1>Q1 Financial Statement</h1>'
                    .'<p>Quarterly financial summary for United Apparts covering revenue collected, invoices issued, '
                    .'new customers acquired, and outstanding receivables.</p>',
            ],
        ];

        foreach ($documents as $doc) {
            $pdfBinary = Pdf::loadHTML($doc['html'])->output();
            $path = 'documents/'.Str::uuid().'.pdf';

            Storage::disk('public')->put($path, $pdfBinary);

            $document = Document::create([
                'company_id' => $company->id,
                'uploaded_by' => $admin->id,
                'title' => $doc['title'],
                'original_name' => Str::slug($doc['title']).'.pdf',
                'path' => $path,
                'disk' => 'local',
                'type' => 'pdf',
                'category' => $doc['category'],
                'size' => strlen($pdfBinary),
                'expires_at' => $doc['expires_at'],
            ]);

            $search->indexDocument($document);
        }
    }
}
