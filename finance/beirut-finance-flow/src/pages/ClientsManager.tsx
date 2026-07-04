
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { useAppContext } from "@/context/AppContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Building2, Plus, Users } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import ClientAccountStatement from "@/components/clients/ClientAccountStatement";

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  // Accept blank email; only validate when a value is provided.
  email: z.string().optional().refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: "Invalid email address" }
  ),
  taxId: z.string().optional(),
});

const ClientsManager = () => {
  const { clients, addClient, logout, invoices, receipts } = useAppContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const selectedTotals = useMemo(() => {
    if (!selectedClient) return null;
    const clientInvoices = invoices.filter(
      (inv) => inv.clientId === selectedClient.id || inv.clientName === selectedClient.name
    );
    const clientReceipts = receipts.filter(
      (r) => r.clientId === selectedClient.id || r.clientName === selectedClient.name
    );

    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPaid = clientReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const outstanding = Math.max(0, totalInvoiced - totalPaid);
    return { totalInvoiced, totalPaid, outstanding };
  }, [invoices, receipts, selectedClient]);

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      taxId: "", // Added tax ID default value
    },
  });

  const onSubmit = async (values: z.infer<typeof clientSchema>) => {
    const id = await addClient({
      name: values.name,
      address: values.address || "",
      phone: values.phone || "",
      email: values.email || "",
      taxId: values.taxId || "",
    });

    if (id) {
      toast({
        title: "Client Added",
        description: "Client has been successfully added",
      });
      form.reset();
      setActiveTab("list");
    }
    // Errors surfaced as toasts by the context helper.
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out",
    });
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Clients Manager</h1>
            <p className="text-sm text-muted-foreground sm:text-base">Add and manage your clients</p>
          </div>
          <Button 
            className="min-h-11 w-full sm:w-auto"
            onClick={() => setActiveTab("add")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        <Card className="overflow-hidden">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="p-3 sm:p-6">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="list">Client List</TabsTrigger>
                <TabsTrigger value="add">Add Client</TabsTrigger>
                {selectedClient && <TabsTrigger value="statement">Account Statement</TabsTrigger>}
              </TabsList>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <TabsContent value="list">
              {clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No clients added yet. Add your first client!</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
                  {clients.map((client) => {
                    const clientInvoices = invoices.filter(
                      (inv) => inv.clientId === client.id || inv.clientName === client.name
                    );
                    const clientReceipts = receipts.filter(
                      (r) => r.clientId === client.id || r.clientName === client.name
                    );
                    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                    const totalPaid = clientReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
                    const outstanding = Math.max(0, totalInvoiced - totalPaid);

                    return (
                      <div
                        key={client.id}
                        className="min-w-0 cursor-pointer rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/50 sm:p-4"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setActiveTab("statement");
                        }}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="shrink-0 rounded-full bg-secondary p-2">
                            <Building2 className="h-5 w-5 text-secondary-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-medium leading-tight">{client.name}</h3>
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                              {[client.email, client.phone].filter(Boolean).join(" • ")}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className="text-sm font-bold sm:text-base">{formatCurrency(outstanding, "USD")}</p>
                          {outstanding > 0 && (
                            <Badge variant="destructive" className="shrink-0 text-[10px] sm:text-xs">
                              Owes {formatCurrency(outstanding, "USD")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </TabsContent>

              <TabsContent value="add">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter client name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="client@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Client phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Client tax identification number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Client address" 
                            {...field} 
                            className="resize-none min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2 sm:pt-4">
                    <Button 
                      type="submit" 
                      className="min-h-11 w-full sm:w-auto"
                    >
                      Add Client
                    </Button>
                  </div>
                </form>
              </Form>
              </TabsContent>

              <TabsContent value="statement">
              {selectedClient ? (
                <ClientAccountStatement
                  client={selectedClient}
                  invoices={invoices}
                  receipts={receipts}
                  onBack={() => {
                    setActiveTab("list");
                    setSelectedClientId(null);
                  }}
                />
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <p>Select a client from the list to view their statement.</p>
                </div>
              )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ClientsManager;
