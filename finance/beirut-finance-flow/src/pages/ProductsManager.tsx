
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import AppLayout from "@/components/AppLayout";
import { useAppContext } from "@/context/AppContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, Package, Tag, DollarSign, Trash2, X } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1, "Product/Service name is required"),
  description: z.string().optional(),
  type: z.enum(["product", "service"]).default("product"),
  rawPrice: z.coerce.number().min(0, "Cost must be 0 or greater").optional(),
  salePrice: z.coerce.number().min(0.01, "Sale price must be greater than 0"),
});

const ProductsManager = () => {
  const { products, addProduct, updateProduct, deleteProduct, logout } = useAppContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [editingProduct, setEditingProduct] = useState<(typeof products)[number] | null>(null);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "product",
      rawPrice: undefined,
      salePrice: undefined,
    },
  });

  const productType = form.watch("type");

  const calculateProfitMargin = (rawPrice: number, salePrice: number): number => {
    if (rawPrice === 0) return 100;
    if (salePrice <= rawPrice) return 0;
    return parseFloat((((salePrice - rawPrice) / salePrice) * 100).toFixed(2));
  };

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    // Stock is intentionally NOT set here — new products start at 0 and only change
    // via purchase orders, manufacturing, or inventory adjustments.
    const productData: any = {
      name: values.name,
      description: values.description || "",
      type: values.type,
      rawPrice: values.rawPrice,
      salePrice: values.salePrice,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast({
        title: `${values.type === "product" ? "Product" : "Service"} Updated`,
        description: "Changes have been saved",
      });
      setEditingProduct(null);
      form.reset();
      setActiveTab("list");
      return;
    }

    const id = await addProduct(productData);
    if (!id) return; // error toast already shown by context

    toast({
      title: `${values.type === "product" ? "Product" : "Service"} Added`,
      description: values.type === "product"
        ? "Product added with 0 stock. Use Purchase Orders or Inventory to add stock."
        : "Service has been successfully added",
    });

    form.reset();
    setActiveTab("list");
  };

  const handleEdit = (product: (typeof products)[number]) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      type: product.type === "service" ? "service" : "product",
      rawPrice: product.rawPrice,
      salePrice: product.salePrice,
    });
    setActiveTab("add");
  };

  const handleDelete = (product: (typeof products)[number]) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    deleteProduct(product.id);
    toast({
      title: "Deleted",
      description: `${product.type === "service" ? "Service" : "Product"} has been deleted`,
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    form.reset();
    setActiveTab("list");
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
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Products & Services</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">Manage your products and services</p>
          </div>
          <Button 
            className="min-h-11 w-full bg-teal-600 hover:bg-teal-700 sm:w-auto"
            onClick={() => {
              setEditingProduct(null);
              form.reset();
              setActiveTab("add");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card className="overflow-hidden">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="p-3 sm:p-6">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="list">Product List</TabsTrigger>
                <TabsTrigger value="add">{editingProduct ? "Edit Product" : "Add Product"}</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <TabsContent value="list">
              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No products added yet. Add your first product or service!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <div key={product.id} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="min-w-0 flex-1 truncate font-medium">{product.name}</h3>
                        {product.type === "product" ? (
                          <Package className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Tag className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2 capitalize">{product.type}</p>
                      <div className="mt-1 flex flex-wrap justify-between gap-2">
                        <p className="text-teal-600 dark:text-teal-400 font-medium">
                          {formatCurrency(product.salePrice, "USD")}
                        </p>
                        {product.rawPrice !== undefined && (
                          <p className="text-sm text-gray-500">
                            Cost: {formatCurrency(product.rawPrice, "USD")}
                          </p>
                        )}
                      </div>
                      {product.type === "product" && product.stockQuantity !== undefined && (
                        <p className="mt-1 text-sm">
                          <span className={product.stockQuantity < 10 ? "text-red-600 font-semibold" : "text-gray-600"}>
                            Stock: {product.stockQuantity} units
                          </span>
                        </p>
                      )}
                      {product.rawPrice !== undefined && product.salePrice !== undefined && (
                        <p className="mt-1 text-green-600 text-sm">
                          Margin: {calculateProfitMargin(product.rawPrice, product.salePrice)}%
                        </p>
                      )}
                      {product.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="min-h-10" onClick={() => handleEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-10 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </TabsContent>

              <TabsContent value="add">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Type Toggle */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <Button
                              type="button"
                              variant={field.value === "product" ? "default" : "outline"}
                              onClick={() => field.onChange("product")}
                              className="flex-1"
                            >
                              <Package className="mr-2 h-4 w-4" />
                              Product
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "service" ? "default" : "outline"}
                              onClick={() => field.onChange("service")}
                              className="flex-1"
                            >
                              <Tag className="mr-2 h-4 w-4" />
                              Service
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{productType === "product" ? "Product" : "Service"} Name</FormLabel>
                        <FormControl>
                          <Input placeholder={`Enter ${productType === "product" ? "product" : "service"} name`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rawPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost {productType === "service" && "(Optional)"}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                              <NumericInput
                                placeholder="0.00"
                                className="pl-8"
                                value={field.value as number | null | undefined}
                                onValueChange={(n) => field.onChange(n)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Price</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Tag className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                              <NumericInput
                                placeholder="0.00"
                                className="pl-8"
                                value={field.value as number | null | undefined}
                                onValueChange={(n) => field.onChange(n)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {productType === "product" && (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Stock starts at 0. Add stock via Purchase Orders, Manufacturing, or Inventory adjustments.
                    </div>
                  )}


                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={`Enter ${productType === "product" ? "product" : "service"} description`}
                            {...field} 
                            className="resize-none min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        {editingProduct ? "Save Changes" : `Add ${productType === "product" ? "Product" : "Service"}`}
                      </Button>
                      {editingProduct && (
                        <Button type="button" variant="outline" onClick={cancelEdit}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProductsManager;
