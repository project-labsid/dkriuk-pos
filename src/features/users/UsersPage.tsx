'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCog,
} from 'lucide-react';
import type { User, Branch, UserRole } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

// ─── Types ───────────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  cashier: 'Kasir',
};

const roleBadgeStyles: Record<string, string> = {
  super_admin:
    'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800',
  admin: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800',
  cashier:
    'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800',
};

// ─── Form Schema ───────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'cashier']).default('cashier'),
  branchId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

const editUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'cashier']),
  branchId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type CreateUserData = z.infer<typeof createUserSchema>;
type EditUserData = z.infer<typeof editUserSchema>;

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Role Badge ─────────────────────────────────────────────────────────────

function getRoleBadge(role: string) {
  const label = roleLabels[role] || role;
  const style = roleBadgeStyles[role] || '';
  return (
    <Badge className={style}>
      {label}
    </Badge>
  );
}

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Aktif
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
      Tidak Aktif
    </Badge>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();

  // ── Filter State ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ── Dialog State ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const createForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'cashier',
      branchId: '',
      isActive: true,
    },
  });

  const editForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'cashier',
      branchId: '',
      isActive: true,
    },
  });

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const usersQuery = useQuery<{
    users: User[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ['users', debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error('Gagal memuat pengguna');
      return res.json();
    },
  });

  const branchesQuery = useQuery<{ data: Branch[] }>({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Gagal memuat cabang');
      return res.json();
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.phone) delete payload.phone;
      if (!payload.branchId) delete payload.branchId;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'super_admin',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambah pengguna');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditUserData) => {
      if (!editingUser) return;
      const payload: Record<string, unknown> = { ...data };
      // Only include password if it's not empty
      if (!payload.password) delete payload.password;
      if (!payload.phone) payload.phone = null;
      // Send null for branchId if empty string
      if (!payload.branchId) payload.branchId = null;
      const res = await fetch(`/api/auth/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'super_admin',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui pengguna');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/auth/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'super_admin',
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus pengguna');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteOpen(false);
      setDeletingUser(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ── Derived Data ────────────────────────────────────────────────────────────

  const allUsers = useMemo(() => usersQuery.data?.users ?? [], [usersQuery.data]);
  const pagination = usersQuery.data?.pagination;
  const allBranches = useMemo(
    () => branchesQuery.data?.data ?? [],
    [branchesQuery.data]
  );

  const isLoading =
    usersQuery.isLoading || usersQuery.isFetching;
  const isMutating =
    createMutation.isPending || updateMutation.isPending;

  const startItem = pagination
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const endItem = pagination
    ? Math.min(
        pagination.page * pagination.limit,
        pagination.total
      )
    : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    setEditingUser(null);
    createForm.reset({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'cashier',
      branchId: '',
      isActive: true,
    });
    setFormOpen(true);
  }, [createForm]);

  const openEditDialog = useCallback(
    (user: User) => {
      setEditingUser(user);
      editForm.reset({
        name: user.name,
        email: user.email,
        password: '',
        phone: user.phone ?? '',
        role: user.role as UserRole,
        branchId: user.branchId ?? '',
        isActive: user.isActive,
      });
      setFormOpen(true);
    },
    [editForm]
  );

  const openDeleteDialog = useCallback((user: User) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormOpen(false);
    setEditingUser(null);
  }, []);

  const onSubmitCreateForm = useCallback(
    (data: CreateUserData) => {
      createMutation.mutate(data);
    },
    [createMutation]
  );

  const onSubmitEditForm = useCallback(
    (data: EditUserData) => {
      updateMutation.mutate(data);
    },
    [updateMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser.id);
    }
  }, [deletingUser, deleteMutation]);

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'index',
        header: 'No',
        size: 50,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {(pagination?.page ?? 1 - 1) * (pagination?.limit ?? pageSize) +
              row.index +
              1}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nama',
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Telepon',
        size: 120,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.phone || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        size: 120,
        cell: ({ row }) => getRoleBadge(row.original.role),
      },
      {
        accessorKey: 'branch',
        header: 'Cabang',
        size: 130,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.branch?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        size: 110,
        cell: ({ row }) => getStatusBadge(row.original.isActive),
      },
      {
        id: 'actions',
        header: 'Aksi',
        size: 80,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Pencil className="size-4" />
                <span className="sr-only">Aksi</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openEditDialog(row.original)}
              >
                <Pencil className="size-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteDialog(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [openEditDialog, openDeleteDialog, pagination]
  );

  // ── Table ─────────────────────────────────────────────────────────────────

  const table = useReactTable({
    data: allUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? 1,
    state: {
      pagination: {
        pageIndex: (pagination?.page ?? 1) - 1,
        pageSize: pagination?.limit ?? pageSize,
      },
    },
  });

  // ── Branch Select Content ─────────────────────────────────────────────────

  const branchSelectContent = (
    <SelectContent>
      <SelectItem value="none">-- Tidak ada cabang --</SelectItem>
      <SelectGroup>
        <SelectLabel>Pilih Cabang</SelectLabel>
        {allBranches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  );

  // ── Create Form Content ──────────────────────────────────────────────────

  const createFormContent = (
    <Form {...createForm}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-4"
      >
        <FormField
          control={createForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input placeholder="Nama lengkap" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={createForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Min. 6 karakter"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={createForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="Nomor telepon" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="super_admin">
                      Super Admin
                    </SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={createForm.control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cabang</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                </FormControl>
                {branchSelectContent}
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createForm.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Status Aktif</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Aktifkan akun pengguna
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  // ── Edit Form Content ──────────────────────────────────────────────────

  const editFormContent = (
    <Form {...editForm}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-4"
      >
        <FormField
          control={editForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input placeholder="Nama lengkap" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={editForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Password{' '}
                  <span className="text-muted-foreground font-normal">
                    (kosongkan jika tidak diubah)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Kosongkan jika tidak diubah"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={editForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="Nomor telepon" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="super_admin">
                      Super Admin
                    </SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={editForm.control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cabang</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                </FormControl>
                {branchSelectContent}
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={editForm.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Status Aktif</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Aktifkan akun pengguna
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pengguna dan hak akses
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          Tambah Pengguna
        </Button>
      </motion.div>

      {/* ── Search & Table ────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="border rounded-xl bg-card shadow-sm"
      >
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-6" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[160px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[90px] rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[80px] rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : allUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserCog className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        {search
                          ? 'Tidak ada pengguna yang sesuai dengan pencarian'
                          : 'Belum ada pengguna. Klik "Tambah Pengguna" untuk memulai.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {pagination && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan {startItem}-{endItem} dari {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
                <span className="sm:hidden">Sebelumnya</span>
              </Button>
              <div className="flex items-center gap-1 text-sm">
                <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground font-medium">
                  {page}
                </span>
                <span className="text-muted-foreground">
                  dari {pagination.totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) =>
                    Math.min(pagination.totalPages, p + 1)
                  )
                }
                disabled={page >= pagination.totalPages}
              >
                <span className="sm:hidden">Berikutnya</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Add User Dialog (Desktop) ─────────────────────────────────────── */}
      <Dialog
        open={formOpen && !editingUser}
        onOpenChange={setFormOpen}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Isi detail pengguna yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          {createFormContent}
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={closeFormDialog}
              disabled={isMutating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={createForm.handleSubmit(onSubmitCreateForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Simpan Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog (Desktop) ─────────────────────────────────────── */}
      <Dialog
        open={formOpen && !!editingUser}
        onOpenChange={setFormOpen}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Ubah detail pengguna {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          {editFormContent}
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={closeFormDialog}
              disabled={isMutating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={editForm.handleSubmit(onSubmitEditForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Perbarui Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Sheet (Mobile) ───────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          side="bottom"
          className="sm:max-h-[85vh] rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>
              {editingUser
                ? 'Edit Pengguna'
                : 'Tambah Pengguna Baru'}
            </SheetTitle>
            <SheetDescription>
              {editingUser
                ? 'Ubah detail pengguna'
                : 'Isi detail pengguna yang akan ditambahkan'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {editingUser ? editFormContent : createFormContent}
          </div>
          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeFormDialog}
              disabled={isMutating}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (editingUser) {
                  editForm.handleSubmit(onSubmitEditForm)();
                } else {
                  createForm.handleSubmit(onSubmitCreateForm)();
                }
              }}
              disabled={isMutating}
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation Dialog ────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengguna{' '}
              <span className="font-semibold">
                {deletingUser?.name}
              </span>{' '}
              akan dihapus. Jika pengguna memiliki riwayat transaksi, akun
              akan dinonaktifkan alih-alih dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
