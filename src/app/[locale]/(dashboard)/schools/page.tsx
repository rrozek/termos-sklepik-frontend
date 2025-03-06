'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { schoolsApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { School, UserRole } from '@/types';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  opening_hour: z.string().optional(),
  closing_hour: z.string().optional(),
  monday_enabled: z.boolean().default(true),
  tuesday_enabled: z.boolean().default(true),
  wednesday_enabled: z.boolean().default(true),
  thursday_enabled: z.boolean().default(true),
  friday_enabled: z.boolean().default(true),
  saturday_enabled: z.boolean().default(false),
  sunday_enabled: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

// Helper function to generate time options
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      const time = `${formattedHour}:${formattedMinute}`;
      options.push(time);
    }
  }
  return options;
};

function SchoolsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      postal_code: '',
      contact_email: '',
      contact_phone: '',
      opening_hour: '',
      closing_hour: '',
      monday_enabled: true,
      tuesday_enabled: true,
      wednesday_enabled: true,
      thursday_enabled: true,
      friday_enabled: true,
      saturday_enabled: false,
      sunday_enabled: false,
      is_active: true,
    },
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const response = await schoolsApi.getSchools();

      // Extract schools data using the utility function
      const schoolsData = extractResponseData<School[]>(response);
      setSchools(schoolsData || []);
    } catch (error: any) {
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'Failed to fetch schools',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await schoolsApi.createSchool(values);

      if (response.success) {
        // Extract the created school from the response
        const newSchool = extractResponseData<School>(response);

        toast({
          title: 'Success',
          description: response.message || 'School created successfully',
        });
        setIsDialogOpen(false);
        form.reset();
        fetchSchools();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to create school',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (schoolId: string) => {
    router.push(`/schools/${schoolId}`);
  };

  // Only staff and admin can access this page
  if (user?.role !== UserRole.STAFF && user?.role !== UserRole.ADMIN) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add School</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Enter the details for the new school.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="School name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="opening_hour"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Opening Hour</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select opening time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="closing_hour"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Closing Hour</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select closing time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Operating Days</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Monday</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="tuesday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Tuesday</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="wednesday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Wednesday</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="thursday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Thursday</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="friday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Friday</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="saturday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Saturday</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="sunday_enabled"
                      render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Sunday</FormLabel>
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
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }: { field: any }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Is this school currently active?
                        </FormDescription>
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
                <DialogFooter>
                  <Button type="submit">Create School</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading schools...</div>
      ) : schools.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg mb-4">No schools found</p>
          <p className="text-gray-500 mb-6">
            Add your first school to start managing school locations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <Card key={school.id} className={!school.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle>{school.name}</CardTitle>
                <CardDescription>
                  {school.address && `${school.address}, `}
                  {school.city && `${school.city}, `}
                  {school.postal_code && school.postal_code}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {school.contact_email && (
                    <p className="text-sm">Email: {school.contact_email}</p>
                  )}
                  {school.contact_phone && (
                    <p className="text-sm">Phone: {school.contact_phone}</p>
                  )}
                  {(school.opening_hour || school.closing_hour) && (
                    <p className="text-sm">
                      Hours: {school.opening_hour || 'N/A'} - {school.closing_hour || 'N/A'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {school.monday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Mon</span>}
                    {school.tuesday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Tue</span>}
                    {school.wednesday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Wed</span>}
                    {school.thursday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Thu</span>}
                    {school.friday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Fri</span>}
                    {school.saturday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Sat</span>}
                    {school.sunday_enabled && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Sun</span>}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => handleViewDetails(school.id)}
                >
                  View Details
                </Button>
                {!school.is_active && (
                  <span className="text-xs text-gray-500 italic">Inactive</span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(SchoolsPage);