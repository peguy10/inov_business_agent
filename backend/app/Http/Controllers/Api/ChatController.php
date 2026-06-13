<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AiConversationResource;
use App\Http\Resources\AiMessageResource;
use App\Models\AiConversation;
use App\Models\Document;
use App\Services\AzureOpenAIService;
use App\Services\AzureSearchService;
use App\Services\BusinessInsightsService;
use App\Services\ForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function __construct(
        protected AzureOpenAIService $openai,
        protected BusinessInsightsService $insights,
        protected ForecastService $forecast,
        protected AzureSearchService $search,
    ) {
    }

    /**
     * List the authenticated user's AI conversations.
     */
    public function index(Request $request): JsonResponse
    {
        $conversations = AiConversation::query()
            ->where('user_id', $request->user()->id)
            ->latest('updated_at')
            ->get();

        return response()->json([
            'conversations' => AiConversationResource::collection($conversations),
        ]);
    }

    /**
     * Show a conversation with its full message history.
     */
    public function show(AiConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($conversation);

        return response()->json([
            'conversation' => new AiConversationResource($conversation->load('messages')),
        ]);
    }

    /**
     * Delete a conversation.
     */
    public function destroy(AiConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($conversation);

        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted successfully.']);
    }

    /**
     * Send a message to the AI business assistant and receive a reply.
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'conversation_id' => ['nullable', 'integer', 'exists:ai_conversations,id'],
        ]);

        $user = $request->user();
        $message = $request->string('message')->toString();

        if ($request->filled('conversation_id')) {
            $conversation = AiConversation::findOrFail($request->integer('conversation_id'));
            $this->authorizeConversation($conversation, $request);
        } else {
            $conversation = AiConversation::create([
                'company_id' => $user->company_id,
                'user_id' => $user->id,
                'title' => Str::limit($message, 50),
            ]);
        }

        $conversation->messages()->create([
            'role' => 'user',
            'content' => $message,
        ]);

        $context = $this->gatherContext($message, $user->company_id);
        $reply = $this->generateReply($conversation, $context);

        $assistantMessage = $conversation->messages()->create([
            'role' => 'assistant',
            'content' => $reply,
        ]);

        $conversation->touch();

        return response()->json([
            'conversation' => new AiConversationResource($conversation->fresh()),
            'message' => new AiMessageResource($assistantMessage),
        ], 201);
    }

    /**
     * Gather structured business data relevant to the user's question.
     *
     * @return array<string, mixed>
     */
    protected function gatherContext(string $message, int $companyId): array
    {
        $lower = Str::lower($message);
        $context = [];

        if (Str::contains($lower, ['revenue', 'sales', 'income', 'profit', 'earn'])) {
            $context['revenue'] = $this->insights->revenueSummary();
        }

        if (Str::contains($lower, ['unpaid', 'outstanding', 'overdue', 'owe', 'owing', 'receivable', 'debt'])) {
            $context['unpaid_invoices'] = $this->insights->unpaidInvoices();
        }

        if (Str::contains($lower, ['customer', 'client'])) {
            $context['customers'] = $this->insights->customerStats();
        }

        if (Str::contains($lower, ['forecast', 'cash flow', 'cashflow', 'projection', 'predict', 'next month'])) {
            $context['forecast'] = $this->forecast->forecast($companyId);
        }

        if (Str::contains($lower, ['expir'])) {
            $context['expiring_documents'] = Document::query()
                ->whereNotNull('expires_at')
                ->whereDate('expires_at', '<=', now()->addDays(90))
                ->orderBy('expires_at')
                ->get(['title', 'category', 'expires_at'])
                ->map(fn (Document $document) => [
                    'title' => $document->title,
                    'category' => $document->category,
                    'expires_at' => $document->expires_at->toDateString(),
                    'days_until_expiry' => (int) now()->startOfDay()->diffInDays($document->expires_at, false),
                ])
                ->all();
        } elseif (Str::contains($lower, ['document', 'contract', 'file', 'policy', 'agreement'])) {
            $context['documents'] = $this->search->search($message, $companyId, 'document');
        }

        if (empty($context)) {
            $context['revenue'] = $this->insights->revenueSummary();
            $context['unpaid_invoices'] = $this->insights->unpaidInvoices();
            $context['customers'] = $this->insights->customerStats();
        }

        return $context;
    }

    /**
     * Generate the assistant's reply, using Azure OpenAI when configured.
     *
     * @param  array<string, mixed>  $context
     */
    protected function generateReply(AiConversation $conversation, array $context): string
    {
        $history = $conversation->messages()->latest()->take(10)->get()->reverse();

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are INOV, an AI Chief Operating Officer assistant for a small or medium business. '
                    .'Answer the user\'s question using the structured business data provided as JSON context. '
                    .'Be concise, cite specific numbers, and suggest one actionable next step when relevant.',
            ],
        ];

        foreach ($history as $historyMessage) {
            $messages[] = ['role' => $historyMessage->role, 'content' => $historyMessage->content];
        }

        $messages[] = ['role' => 'system', 'content' => 'Business data context (JSON): '.json_encode($context)];

        return $this->openai->chat($messages, [], $conversation->company_id) ?? $this->localReply($context);
    }

    /**
     * Build a templated reply from the gathered context when Azure OpenAI is unavailable.
     *
     * @param  array<string, mixed>  $context
     */
    protected function localReply(array $context): string
    {
        $parts = [];

        if (isset($context['revenue'])) {
            $r = $context['revenue'];

            $parts[] = sprintf(
                'This month\'s revenue is %s, compared to %s last month (year-to-date: %s).',
                number_format($r['this_month'], 2),
                number_format($r['last_month'], 2),
                number_format($r['year_to_date'], 2)
            );
        }

        if (isset($context['unpaid_invoices'])) {
            $u = $context['unpaid_invoices'];

            $parts[] = sprintf(
                'You have %d unpaid invoice(s) totaling %s, including %d overdue worth %s.',
                $u['count'],
                number_format($u['total_outstanding'], 2),
                $u['overdue_count'],
                number_format($u['overdue_total'], 2)
            );
        }

        if (isset($context['customers'])) {
            $c = $context['customers'];

            $parts[] = sprintf('You currently have %d customer(s), with %d new this month.', $c['total'], $c['new_this_month']);
        }

        if (isset($context['forecast'])) {
            $parts[] = $context['forecast']['narrative'];
        }

        if (isset($context['expiring_documents'])) {
            $expiring = $context['expiring_documents'];

            if (empty($expiring)) {
                $parts[] = 'No contracts or documents are expiring within the next 90 days.';
            } else {
                $items = collect($expiring)
                    ->map(function (array $document) {
                        $days = $document['days_until_expiry'];
                        $when = $days < 0
                            ? abs($days).' day(s) ago'
                            : 'in '.$days.' day(s)';

                        return "{$document['title']} (expires {$when}, on {$document['expires_at']})";
                    })
                    ->implode('; ');

                $parts[] = "These documents need attention: {$items}.";
            }
        }

        if (isset($context['documents'])) {
            $docs = $context['documents'];

            if (empty($docs)) {
                $parts[] = 'I could not find any matching documents.';
            } else {
                $titles = collect($docs)->pluck('title')->filter()->take(5)->implode(', ');
                $parts[] = "Here's what I found in your documents: {$titles}.";
            }
        }

        if (empty($parts)) {
            $parts[] = 'I can help with revenue, unpaid invoices, customers, cash flow forecasts, and documents. '
                .'Try asking "What\'s our outstanding revenue?" or "Which invoices are overdue?"';
        }

        return implode(' ', $parts);
    }

    /**
     * Ensure the conversation belongs to the authenticated user.
     */
    protected function authorizeConversation(AiConversation $conversation, ?Request $request = null): void
    {
        $userId = ($request ?? request())->user()->id;

        if ($conversation->user_id !== $userId) {
            abort(404);
        }
    }
}
