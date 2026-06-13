"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { Company } from "@/lib/types";

const azureSchema = z.object({
  azure_openai: z.object({
    endpoint: z.string().optional(),
    key: z.string().optional(),
    deployment: z.string().optional(),
    api_version: z.string().optional(),
  }),
  azure_search: z.object({
    endpoint: z.string().optional(),
    key: z.string().optional(),
    index: z.string().optional(),
    api_version: z.string().optional(),
  }),
  azure_storage: z.object({
    account: z.string().optional(),
    key: z.string().optional(),
    container: z.string().optional(),
  }),
});

type AzureValues = z.infer<typeof azureSchema>;
type ServiceKey = keyof AzureValues;
type TestResult = { success: boolean; message: string };

const EMPTY_VALUES: AzureValues = {
  azure_openai: { endpoint: "", key: "", deployment: "", api_version: "" },
  azure_search: { endpoint: "", key: "", index: "", api_version: "" },
  azure_storage: { account: "", key: "", container: "" },
};

const SERVICES: { key: ServiceKey; label: string; description: string }[] = [
  {
    key: "azure_openai",
    label: "Azure OpenAI",
    description: "Powers AI chat replies, report summaries, and cash flow forecast narratives.",
  },
  {
    key: "azure_search",
    label: "Azure AI Search",
    description: "Indexes documents for fast, relevant knowledge search.",
  },
  {
    key: "azure_storage",
    label: "Azure Blob Storage",
    description: "Stores uploaded documents in the cloud instead of local disk.",
  },
];

interface AzureIntegrationsCardProps {
  company: Company | null;
  isLoading: boolean;
  onUpdated: (company: Company) => void;
}

export function AzureIntegrationsCard({ company, isLoading, onUpdated }: AzureIntegrationsCardProps) {
  const [isSaving, setIsSaving] = useState<ServiceKey | null>(null);
  const [isTesting, setIsTesting] = useState<ServiceKey | null>(null);
  const [testResults, setTestResults] = useState<Partial<Record<ServiceKey, TestResult>>>({});

  const form = useForm<AzureValues>({
    resolver: zodResolver(azureSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    const integrations = company?.integrations;
    if (!integrations) return;

    form.reset({
      azure_openai: {
        endpoint: integrations.azure_openai.endpoint ?? "",
        key: "",
        deployment: integrations.azure_openai.deployment ?? "",
        api_version: integrations.azure_openai.api_version ?? "",
      },
      azure_search: {
        endpoint: integrations.azure_search.endpoint ?? "",
        key: "",
        index: integrations.azure_search.index ?? "",
        api_version: integrations.azure_search.api_version ?? "",
      },
      azure_storage: {
        account: integrations.azure_storage.account ?? "",
        key: "",
        container: integrations.azure_storage.container ?? "",
      },
    });
  }, [company, form]);

  async function saveService(service: ServiceKey) {
    setIsSaving(service);
    setTestResults((prev) => ({ ...prev, [service]: undefined }));

    try {
      const data = await api.put<{ company: Company; message: string }>("/company/integrations/azure", {
        [service]: form.getValues(service),
      });
      onUpdated(data.company);
      form.setValue(`${service}.key`, "");
      toast.success(`${SERVICES.find((s) => s.key === service)?.label} settings saved.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to save Azure settings.");
    } finally {
      setIsSaving(null);
    }
  }

  async function testService(service: ServiceKey) {
    setIsTesting(service);

    try {
      const result = await api.post<TestResult>("/company/integrations/azure/test", { service });
      setTestResults((prev) => ({ ...prev, [service]: result }));

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Connection test failed.";
      setTestResults((prev) => ({ ...prev, [service]: { success: false, message } }));
      toast.error(message);
    } finally {
      setIsTesting(null);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Azure integrations</CardTitle>
          <CardDescription>Connect your own Azure OpenAI, AI Search, and Blob Storage resources.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const integrations = company?.integrations;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Azure integrations</CardTitle>
        <CardDescription>
          Connect your own Azure OpenAI, AI Search, and Blob Storage resources. Leave a field empty to fall back to the
          server defaults.
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <a href="/docs/guide-configuration-azure.pdf" target="_blank" rel="noopener noreferrer" download>
              <Download className="size-4" />
              Setup guide (PDF)
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-8">
            {SERVICES.map((service, index) => {
              const status = integrations?.[service.key];
              const result = testResults[service.key];

              return (
                <div key={service.key} className="space-y-4">
                  {index > 0 && <Separator />}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{service.label}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <Badge variant={status?.configured ? "default" : "outline"}>
                      {status?.configured ? "Connected" : "Not configured"}
                    </Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {service.key === "azure_openai" && (
                      <>
                        <FormField
                          control={form.control}
                          name="azure_openai.endpoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endpoint</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://your-resource.openai.azure.com" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_openai.key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API key</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder={status?.has_key ? "•••••••••••• (configured)" : "API key"}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_openai.deployment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deployment name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="gpt-4o-mini" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_openai.api_version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API version</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="2024-08-01-preview" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {service.key === "azure_search" && (
                      <>
                        <FormField
                          control={form.control}
                          name="azure_search.endpoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endpoint</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://your-search.search.windows.net" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_search.key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API key</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder={status?.has_key ? "•••••••••••• (configured)" : "API key"}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_search.index"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Index name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="inov-documents" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_search.api_version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API version</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="2024-07-01" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {service.key === "azure_storage" && (
                      <>
                        <FormField
                          control={form.control}
                          name="azure_storage.account"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Storage account name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="mystorageaccount" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_storage.key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Access key</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder={status?.has_key ? "•••••••••••• (configured)" : "Access key"}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="azure_storage.container"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Container name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="documents" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveService(service.key)}
                      disabled={isSaving === service.key}
                    >
                      {isSaving === service.key && <Loader2 className="size-4 animate-spin" />}
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => testService(service.key)}
                      disabled={isTesting === service.key}
                    >
                      {isTesting === service.key && <Loader2 className="size-4 animate-spin" />}
                      Test connection
                    </Button>
                    {result && (
                      <span
                        className={`flex items-center gap-1 text-sm ${
                          result.success ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {result.success ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                        {result.message}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
