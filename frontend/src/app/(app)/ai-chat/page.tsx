"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquarePlus, Send, Sparkles, Trash2, User as UserIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BlurText } from "@/components/animations/blur-text";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { AiConversation, AiMessage } from "@/lib/types";

const SUGGESTED_PROMPTS = [
  "What's our revenue this month compared to last month?",
  "Which invoices are overdue?",
  "What's the cash flow forecast for next month?",
  "Are any contracts or documents expiring soon?",
];

interface ConversationsResponse {
  conversations: AiConversation[];
}

interface ConversationResponse {
  conversation: AiConversation;
}

interface SendResponse {
  conversation: AiConversation;
  message: AiMessage;
}

export default function AiChatPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiConversation | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const data = await api.get<ConversationsResponse>("/chat/conversations");
      setConversations(data.conversations);
    } catch {
      toast.error("Failed to load conversations.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isSending]);

  async function openConversation(id: number) {
    if (id === activeId) return;

    setActiveId(id);
    try {
      const data = await api.get<ConversationResponse>(`/chat/conversations/${id}`);
      setMessages(data.conversation.messages ?? []);
    } catch {
      toast.error("Failed to load conversation.");
    }
  }

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage: AiMessage = {
      id: Date.now(),
      conversation_id: activeId ?? 0,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const data = await api.post<SendResponse>("/chat", {
        message: trimmed,
        conversation_id: activeId,
      });

      setMessages((prev) => [...prev, data.message]);

      if (!activeId) {
        setActiveId(data.conversation.id);
      }

      loadConversations();
    } catch {
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((message) => message.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  async function confirmDeleteConversation() {
    if (!deleteTarget) return;

    try {
      await api.delete(`/chat/conversations/${deleteTarget.id}`);
      setConversations((prev) => prev.filter((conversation) => conversation.id !== deleteTarget.id));
      if (activeId === deleteTarget.id) {
        startNewChat();
      }
    } catch {
      toast.error("Failed to delete conversation.");
    } finally {
      setDeleteTarget(null);
    }
  }

  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-4 md:h-[calc(100vh-6.5rem)]">
      <Card className="hidden w-64 shrink-0 flex-col gap-2 p-2 lg:flex">
        <Button variant="outline" className="justify-start" onClick={startNewChat}>
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-1">
            {isLoadingConversations ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            ) : conversations.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No conversations yet.</p>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm hover:bg-muted/60",
                    activeId === conversation.id && "bg-muted"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openConversation(conversation.id)}
                    className="flex-1 truncate text-left"
                  >
                    {conversation.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(conversation)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-4 md:p-6">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <BlurText text="INOV Business Agent" className="text-lg font-semibold" />
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about your revenue, invoices, customers, or cash flow.
                  </p>
                </div>
                <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="rounded-lg border border-border p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={cn("flex items-start gap-3", message.role === "user" && "flex-row-reverse")}
                  >
                    <Avatar size="sm" className="mt-0.5">
                      <AvatarFallback
                        className={message.role === "assistant" ? "bg-primary/10 text-primary" : undefined}
                      >
                        {message.role === "assistant" ? <Bot className="size-3.5" /> : initials || <UserIcon className="size-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <Avatar size="sm" className="mt-0.5">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Thinking...
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about revenue, invoices, customers, or cash flow..."
            className="min-h-11 flex-1 resize-none"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={isSending || !input.trim()}>
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.title}&rdquo; and its message history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteConversation}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
