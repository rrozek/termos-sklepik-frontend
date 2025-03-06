'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { withAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { schoolsApi, kidsApi } from '@/lib/api';
import { extractResponseData, handleApiError } from '@/lib/response-utils';
import { School, Kid, UserRole } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

function SchoolDetailPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.id as string;
  const { toast } = useToast();
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
    fetchSchoolDetails();
  }, [schoolId]);

  const fetchSchoolDetails = async () => {
    setIsLoading(true);
    try {
      const response = await schoolsApi.getSchoolById(schoolId);
      if (response.success) {
        // Extract school data using the utility function
        const schoolData = extractResponseData<School>(response);
        setSchool(schoolData);

        form.reset({
          name: schoolData.name,
          address: schoolData.address || '',
          city: schoolData.city || '',
          postal_code: schoolData.postal_code || '',
          contact_email: schoolData.contact_email || '',
          contact_phone: schoolData.contact_phone || '',
          opening_hour: schoolData.opening_hour || '',
          closing_hour: schoolData.closing_hour || '',
          monday_enabled: schoolData.monday_enabled,
          tuesday_enabled: schoolData.tuesday_enabled,
          wednesday_enabled: schoolData.wednesday_enabled,
          thursday_enabled: schoolData.thursday_enabled,
          friday_enabled: schoolData.friday_enabled,
          saturday_enabled: schoolData.saturday_enabled,
          sunday_enabled: schoolData.sunday_enabled,
          is_active: schoolData.is_active,
        });
        fetchSchoolKids();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to fetch school details',
          variant: 'destructive',
        });
        router.push('/schools');
      }
    } catch (error) {
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      router.push('/schools');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchoolKids = async () => {
    try {
      const response = await schoolsApi.getSchoolKids(schoolId);
      if (response.success) {
        // Extract kids data using the utility function
        const kidsData = extractResponseData<Kid[]>(response);
        setKids(kidsData);
      } else {
        toast({
          title: 'Warning',
          description: response.message || 'Failed to fetch kids associated with this school',
        });
      }
    } catch (error) {
      console.error('Error fetching school kids:', error);
      const errorInfo = handleApiError(error);
      toast({
        title: 'Warning',
        description: errorInfo.message || 'Failed to fetch associated kids',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await schoolsApi.updateSchool(schoolId, values);
      if (response.success) {
        // Extract updated school data
        const updatedSchool = extractResponseData<School>(response);
        setSchool(updatedSchool);

        toast({
          title: 'Success',
          description: response.message || 'School updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to update school',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSchool = async () => {
    try {
      const response = await schoolsApi.deleteSchool(schoolId);
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'School deleted successfully',
        });
        router.push('/schools');
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete school',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorInfo = handleApiError(error);
      toast({
        title: 'Error',
        description: errorInfo.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleViewKid = (kidId: string) => {
    router.push(`/kids/${kidId}`);
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading school details...</div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">School not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{school.name}</h1>
          <p className="text-gray-500">
            {school.address && `${school.address}, `}
            {school.city && `${school.city}, `}
            {school.postal_code && school.postal_code}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/schools')}>
            Back to Schools
          </Button>
          {user?.role === UserRole.ADMIN && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete School</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the school
                    and remove all associations with kids.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSchool}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-6">
        <TabsList>
          <TabsTrigger value="details">School Details</TabsTrigger>
          <TabsTrigger value="kids">Associated Kids ({kids.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Update the school details below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="School name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
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
                        render={({ field }) => (
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
                        render={({ field }) => (
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
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
                      render={({ field }) => (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <h3 className="text-sm font-medium mb-2">Operating Days</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name={`${day}_enabled` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="capitalize">{day}</FormLabel>
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
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
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
                  <div className="flex justify-end">
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kids" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Associated Kids</CardTitle>
              <CardDescription>
                Kids that are associated with this school
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kids.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No kids associated with this school yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kids.map((kid) => (
                    <Card key={kid.id} className={!kid.is_active ? 'opacity-60' : ''}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{kid.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {kid.rfid_token && kid.rfid_token.length > 0 && (
                          <p className="text-sm">RFID: {kid.rfid_token.join(', ')}</p>
                        )}
                        {kid.monthly_spending_limit && (
                          <p className="text-sm">
                            Monthly Limit: ${kid.monthly_spending_limit}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewKid(kid.id)}
                        >
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withAuth(SchoolDetailPage);