import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Building, Upload } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  config: any;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method_id: string;
  credits_awarded: number;
  created_at: string;
  payment_methods: { display_name: string };
}

export default function Billing() {
  const { user, credits } = useAuth();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [amount, setAmount] = useState<string>("100");
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
    fetchTransactions();
  }, []);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("is_enabled", true)
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load payment methods", variant: "destructive" });
    } else {
      setPaymentMethods(data || []);
      if (data && data.length > 0) setSelectedMethod(data[0].id);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        payment_methods (display_name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast({ title: "Error", description: "Failed to load transactions", variant: "destructive" });
    } else {
      setTransactions(data || []);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod || !amount) {
      toast({ title: "Error", description: "Please select payment method and amount", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let proofUrl = "";
      
      // For manual payments, upload proof if provided
      const selectedPaymentMethod = paymentMethods.find(pm => pm.id === selectedMethod);
      if (selectedPaymentMethod?.name === "manual" && proofFile) {
        // For now, we'll just store the filename. In production, upload to storage
        proofUrl = proofFile.name;
      }

      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          paymentMethodId: selectedMethod,
          amount: parseFloat(amount),
          currency: "BDT",
          proofUrl
        }
      });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: data.message || "Payment processed successfully"
      });
      
      setAmount("100");
      setProofFile(null);
      fetchTransactions();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Payment failed", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodName: string) => {
    switch (methodName) {
      case "bkash":
      case "nagad":
        return <Smartphone className="h-5 w-5" />;
      case "stripe":
        return <CreditCard className="h-5 w-5" />;
      case "manual":
        return <Building className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary", 
      completed: "default",
      approved: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p>Please sign in to access billing features.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Billing & Credits</h1>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Credits</p>
            <p className="text-2xl font-bold text-primary">{credits?.amount || 0}</p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="purchase" className="space-y-6">
        <TabsList>
          <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="purchase">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Credits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount (BDT)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="10"
                      step="10"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      You will receive {Math.floor(parseFloat(amount || "0"))} credits
                    </p>
                  </div>

                  <div>
                    <Label>Payment Method</Label>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedMethod === method.id 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedMethod(method.id)}
                        >
                          <div className="flex items-center space-x-3">
                            {getMethodIcon(method.name)}
                            <div>
                              <p className="font-medium">{method.display_name}</p>
                              {method.name === "manual" && (
                                <div className="mt-2 space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    Requires admin approval
                                  </p>
                                  {method.config.payment_number && (
                                    <div className="text-sm">
                                      <span className="font-medium">Payment Number: </span>
                                      <code className="bg-muted px-2 py-1 rounded text-xs">
                                        {method.config.payment_number}
                                      </code>
                                    </div>
                                  )}
                                  {method.config.instructions && (
                                    <div className="text-sm">
                                      <span className="font-medium">Instructions: </span>
                                      <p className="text-muted-foreground mt-1">
                                        {method.config.instructions}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {paymentMethods.find(pm => pm.id === selectedMethod)?.name === "manual" && (
                    <div>
                      <Label htmlFor="sender-number">Your Payment Number *</Label>
                      <Input
                        id="sender-number"
                        type="text"
                        placeholder="Enter your bKash/Nagad/Bank number"
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the number you're sending payment from
                      </p>
                    </div>
                  )}

                  {paymentMethods.find(pm => pm.id === selectedMethod)?.name === "manual" && (
                    <div>
                      <Label htmlFor="proof">Payment Proof (Required)</Label>
                      <div className="mt-2">
                        <Input
                          id="proof"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          required
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload screenshot or receipt of your payment (Required)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Payment Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>{amount} BDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credits:</span>
                        <span>{Math.floor(parseFloat(amount || "0"))}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>{amount} BDT</span>
                      </div>
                    </div>
                  </Card>

                  <Button 
                    onClick={handlePayment} 
                    disabled={loading || !selectedMethod}
                    className="w-full"
                  >
                    {loading ? "Processing..." : "Purchase Credits"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {transaction.amount} {transaction.currency}
                      </TableCell>
                      <TableCell>{transaction.payment_methods?.display_name}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>{transaction.credits_awarded}</TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No payment history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}