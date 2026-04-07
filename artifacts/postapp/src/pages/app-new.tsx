import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateApp, getListAppsQueryKey, getGetAppsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Link2 } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  platform: z.string().min(1, "Platform is required"),
  status: z.string().min(1, "Status is required"),
  description: z.string().optional(),
  bundleId: z.string().optional(),
  version: z.string().optional(),
  category: z.string().optional(),
  replitUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function AppNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createApp = useCreateApp();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      platform: "iOS",
      status: "draft",
      description: "",
      bundleId: "",
      version: "1.0.0",
      category: "",
      replitUrl: "",
    },
  });

  function onSubmit(data: FormValues) {
    createApp.mutate({ data }, {
      onSuccess: (app) => {
        toast({
          title: "Target Initialized",
          description: "Application has been added to the tracking system.",
        });
        queryClient.invalidateQueries({ queryKey: getListAppsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAppsSummaryQueryKey() });
        setLocation(`/apps/${app.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to initialize application target.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Command Center
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Initialize Target</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Configure a new app submission tracking profile</p>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">App Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Project Orion" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="iOS">iOS</SelectItem>
                        <SelectItem value="Android">Android</SelectItem>
                        <SelectItem value="Both">Both (Cross-platform)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bundleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Bundle ID / Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="com.example.app" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Version</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Productivity" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">DRAFT</SelectItem>
                        <SelectItem value="ready-for-submission">READY FOR SUBMISSION</SelectItem>
                        <SelectItem value="in-review">IN REVIEW</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="replitUrl"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="h-3 w-3" />
                    Replit Project URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://replit.com/@username/project-name"
                      className="font-mono"
                      data-testid="input-replit-url"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Paste the link from your Replit home screen so you can open the project directly from here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the app and submission strategy..." 
                      className="min-h-[100px] resize-none font-mono text-sm" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" disabled={createApp.isPending} className="font-mono uppercase tracking-wider text-xs">
                {createApp.isPending ? "Initializing..." : "Initialize Target"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
