"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AzureIntegrationsCard } from "@/components/settings/azure-integrations-card";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import type { Company, Role, User } from "@/lib/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

const companySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  industry: z.string().max(255).optional().or(z.literal("")),
});
type CompanyValues = z.infer<typeof companySchema>;

const addMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "manager", "employee"]),
});
type AddMemberValues = z.infer<typeof addMemberSchema>;

const editMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  role: z.enum(["admin", "manager", "employee"]),
});
type EditMemberValues = z.infer<typeof editMemberSchema>;

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const isAdmin = user?.role === "admin";
  const canViewTeam = user?.role === "admin" || user?.role === "manager";

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const companyForm = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", industry: "" },
  });

  const addMemberForm = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { name: "", email: "", password: "", role: "employee" },
  });

  const editMemberForm = useForm<EditMemberValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: { name: "", role: "employee" },
  });

  const loadCompany = useCallback(async () => {
    setIsLoadingCompany(true);
    try {
      const data = await api.get<{ company: Company }>("/company");
      setCompany(data.company);
      companyForm.reset({ name: data.company.name, industry: data.company.industry ?? "" });
    } catch {
      toast.error("Failed to load company profile.");
    } finally {
      setIsLoadingCompany(false);
    }
  }, [companyForm]);

  const loadMembers = useCallback(async () => {
    if (!canViewTeam) {
      setIsLoadingMembers(false);
      return;
    }

    setIsLoadingMembers(true);
    try {
      const data = await api.get<{ users: User[] }>("/company/users");
      setMembers(data.users);
    } catch {
      toast.error("Failed to load team members.");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [canViewTeam]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (addMemberOpen) {
      addMemberForm.reset({ name: "", email: "", password: "", role: "employee" });
    }
  }, [addMemberOpen, addMemberForm]);

  useEffect(() => {
    if (editingMember) {
      editMemberForm.reset({ name: editingMember.name, role: editingMember.role });
    }
  }, [editingMember, editMemberForm]);

  async function onSubmitCompany(values: CompanyValues) {
    setIsSavingCompany(true);
    try {
      const data = await api.put<{ company: Company }>("/company", {
        name: values.name,
        industry: values.industry || null,
      });
      setCompany(data.company);
      await refresh();
      toast.success("Company profile updated successfully.");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            companyForm.setError(field as keyof CompanyValues, { message: messages[0] });
          });
        }
        toast.error(error.message);
      } else {
        toast.error("Failed to update company profile.");
      }
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const data = await api.post<{ company: Company }>("/company/logo", formData);
      setCompany(data.company);
      await refresh();
      toast.success("Logo updated successfully.");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to upload logo.");
      }
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function onSubmitAddMember(values: AddMemberValues) {
    setIsAddingMember(true);
    try {
      await api.post("/company/users", values);
      toast.success("Team member added successfully.");
      setAddMemberOpen(false);
      loadMembers();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            addMemberForm.setError(field as keyof AddMemberValues, { message: messages[0] });
          });
        }
        toast.error(error.message);
      } else {
        toast.error("Failed to add team member.");
      }
    } finally {
      setIsAddingMember(false);
    }
  }

  async function onSubmitEditMember(values: EditMemberValues) {
    if (!editingMember) return;

    setIsSavingMember(true);
    try {
      await api.put(`/company/users/${editingMember.id}`, values);
      toast.success("Team member updated successfully.");
      setEditingMember(null);
      loadMembers();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            editMemberForm.setError(field as keyof EditMemberValues, { message: messages[0] });
          });
        }
        toast.error(error.message);
      } else {
        toast.error("Failed to update team member.");
      }
    } finally {
      setIsSavingMember(false);
    }
  }

  async function confirmDeleteMember() {
    if (!deleteTarget) return;

    setIsDeletingMember(true);
    try {
      await api.delete(`/company/users/${deleteTarget.id}`);
      toast.success("Team member removed successfully.");
      setDeleteTarget(null);
      loadMembers();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to remove team member.");
      }
    } finally {
      setIsDeletingMember(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company profile and team members.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
            <CardDescription>Basic information about your company.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCompany ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-4">
                  <FormField
                    control={companyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} placeholder="e.g. Apparel Wholesale & Manufacturing" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isAdmin && (
                    <Button type="submit" disabled={isSavingCompany}>
                      {isSavingCompany && <Loader2 className="size-4 animate-spin" />}
                      Save changes
                    </Button>
                  )}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company logo</CardTitle>
            <CardDescription>Shown in the sidebar and on generated reports.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar size="lg" className="size-20">
              <AvatarImage src={company?.logo ?? undefined} alt={company?.name ?? "Company logo"} />
              <AvatarFallback className="text-lg">{company?.name?.charAt(0) ?? "?"}</AvatarFallback>
            </Avatar>

            {isAdmin && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload logo
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="text-sm font-medium">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd className="text-sm font-medium capitalize">{user?.role}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {isAdmin && (
        <AzureIntegrationsCard
          company={company}
          isLoading={isLoadingCompany}
          onUpdated={(updated) => setCompany(updated)}
        />
      )}

      {canViewTeam && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Team members</CardTitle>
              <CardDescription>People with access to your company&apos;s INOV workspace.</CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setAddMemberOpen(true)}>
                <Plus className="size-4" />
                Add member
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      {isAdmin && <TableHead className="w-20" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(member.created_at)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => setEditingMember(member)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={member.id === user?.id}
                                onClick={() => setDeleteTarget(member)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>Invite a new user to your company&apos;s workspace.</DialogDescription>
          </DialogHeader>

          <Form {...addMemberForm}>
            <form onSubmit={addMemberForm.handleSubmit(onSubmitAddMember)} className="space-y-4">
              <FormField
                control={addMemberForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addMemberForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addMemberForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addMemberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isAddingMember}>
                  {isAddingMember && <Loader2 className="size-4 animate-spin" />}
                  Add member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>Update {editingMember?.name}&apos;s name or role.</DialogDescription>
          </DialogHeader>

          <Form {...editMemberForm}>
            <form onSubmit={editMemberForm.handleSubmit(onSubmitEditMember)} className="space-y-4">
              <FormField
                control={editMemberForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editMemberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isSavingMember}>
                  {isSavingMember && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from your company&apos;s workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeletingMember} onClick={confirmDeleteMember}>
              {isDeletingMember && <Loader2 className="size-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
