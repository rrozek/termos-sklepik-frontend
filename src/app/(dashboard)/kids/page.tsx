'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { kidsApi } from '@/lib/api';
import { Kid, UserRole } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rfid_token: z.string().optional(),
  monthly_spending_limit: z.string()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      { message: 'Must be a valid number' }
    )
    .transform((val) => val ? Number(val) : undefined),
});

function KidsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      rfid_token: '',
      monthly_spending_limit: '',
    },
  });

  useEffect(() => {
    const fetchKids = async () => {
      if (fetchAttempted) return;

      try {
        setIsLoading(true);
        setError(null);
        setFetchAttempted(true);

        const response = await kidsApi.getKids();
        const kidsData = Array.isArray(response.data) ? response.data : [];

        // For parent users, strip out RFID token information
        if (user?.role === UserRole.PARENT) {
          const sanitizedKids = kidsData.map(kid => ({
            ...kid,
            rfid_token: [] // Remove RFID information for parents
          }));
          setKids(sanitizedKids);
        } else {
          setKids(kidsData);
        }
      } catch (error) {
        console.error('Error fetching kids:', error);
        setError('No kids found. You can add your first kid below.');
        setKids([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchKids();
    }
  }, [fetchAttempted, user]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Only include RFID token if user is admin or staff
      const kidData: any = {
        name: values.name,
        monthly_spending_limit: values.monthly_spending_limit,
      };

      if ((user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF) && values.rfid_token) {
        kidData.rfid_token = [values.rfid_token];
      }

      const response = await kidsApi.createKid(kidData);

      if (response.data) {
        // Create a sanitized version for parents
        let newKid = response.data;
        if (user?.role === UserRole.PARENT) {
          newKid = {
            ...newKid,
            rfid_token: []
          };
        }

        setKids((prev) => [...prev, newKid]);
        setDialogOpen(false);
        form.reset();
        toast({
          title: 'Success',
          description: 'Kid added successfully.',
        });
      }
    } catch (error) {
      console.error('Failed to create kid:', error);
      toast({
        title: 'Error',
        description: 'Failed to create kid. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleViewDetails = (kidId: string) => {
    router.push(`/kids/${kidId}`);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]">Loading kids data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kids</h1>
          <p className="text-muted-foreground">
            Manage your children and their spending limits
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Kid</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a new kid</DialogTitle>
              <DialogDescription>
                Add your child to manage their spending at the school kiosk.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Only show RFID field for admin/staff */}
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF) && (
                  <FormField
                    control={form.control}
                    name="rfid_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFID Token (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="RFID token number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="monthly_spending_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Spending Limit (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="50.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {kids.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h3 className="text-lg font-medium">No kids registered</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add your kids to manage their spending at the school kiosk.
          </p>
          <Button
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            Add Kid
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((kid) => (
            <Card key={kid.id}>
              <CardHeader>
                <CardTitle>{kid.name}</CardTitle>
                <CardDescription>
                  {kid.is_active ? 'Active' : 'Inactive'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Hide RFID info from parents */}
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">RFID Tags:</p>
                    <p className="text-sm text-muted-foreground">
                      {kid.rfid_token && kid.rfid_token.length > 0
                        ? kid.rfid_token.join(', ')
                        : 'No RFID tags assigned'
                      }
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Spending Limit:</p>
                  <p className="text-sm text-muted-foreground">
                    {kid.monthly_spending_limit
                      ? `$${Number(kid.monthly_spending_limit).toFixed(2)} per month`
                      : 'No limit set'
                    }
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDetails(kid.id)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(KidsPage, [UserRole.ADMIN, UserRole.PARENT]);