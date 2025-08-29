import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, CreditCard, CheckCircle, XCircle } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  config: any;
}

interface PaymentTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  external_transaction_id: string;
  proof_url: string;
  admin_notes: string;
  credits_awarded: number;
  created_at: string;
  payment_methods: { display_name: string } | null;
  profiles: { email: string; full_name: string } | null;
}

export default function PaymentManagement() {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [allTransactions, setAllTransactions] = useState<PaymentTransaction[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [creditsToAward, setCreditsToAward] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  useEffect(() => {
    fetchPaymentMethods();
    fetchTransactions();
  }, []);

  useEffect(() => {
    // Filter transactions based on selected filters
    filterTransactions();
  }, [allTransactions, statusFilter, methodFilter]);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load payment methods", variant: "destructive" });
    } else {
      setPaymentMethods(data || []);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        payment_methods (display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Error", description: "Failed to load transactions", variant: "destructive" });
      return;
    }

    // Fetch profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      const transactionsWithProfiles = data.map(transaction => ({
        ...transaction,
        profiles: profilesData?.find(p => p.user_id === transaction.user_id) || null
      }));

      setAllTransactions(transactionsWithProfiles);
    } else {
      setAllTransactions([]);
    }
  };

  const filterTransactions = () => {
    let filtered = allTransactions;

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (methodFilter !== "all") {
      const method = paymentMethods.find(pm => pm.id === methodFilter);
      if (method) {
        filtered = filtered.filter(t => t.payment_method_id === methodFilter);
      }
    }

    setTransactions(filtered);
  };

  const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("payment_methods")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Payment method updated" });
      fetchPaymentMethods();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (status: "approved" | "rejected") => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("approve-payment", {
        body: {
          transactionId: selectedTransaction.id,
          status,
          adminNotes,
          creditsToAward: status === "approved" ? creditsToAward : 0
        }
      });

      if (error) throw error;

      toast({ title: "Success", description: data.message });
      setSelectedTransaction(null);
      setAdminNotes("");
      setCreditsToAward(0);
      fetchTransactions();
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Payment Methods Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {paymentMethods.map((method) => (
                  <Card key={method.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <h3 className="font-semibold">{method.display_name}</h3>
                          <p className="text-sm text-muted-foreground">{method.name}</p>
                        </div>
                      </div>
                      <Switch
                        checked={method.is_enabled}
                        onCheckedChange={(enabled) =>
                          updatePaymentMethod(method.id, { is_enabled: enabled })
                        }
                      />
                    </div>

                    {method.name === "bkash" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Merchant Number</Label>
                          <Input
                            value={method.config.merchant_number || ""}
                            onChange={(e) =>
                              updatePaymentMethod(method.id, {
                                config: { ...method.config, merchant_number: e.target.value }
                              })
                            }
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                        <div>
                          <Label>API Key</Label>
                          <Input
                            type="password"
                            value={method.config.api_key || ""}
                            onChange={(e) =>
                              updatePaymentMethod(method.id, {
                                config: { ...method.config, api_key: e.target.value }
                              })
                            }
                            placeholder="API Key"
                          />
                        </div>
                        <div>
                          <Label>API Secret</Label>
                          <Input
                            type="password"
                            value={method.config.api_secret || ""}
                            onChange={(e) =>
                              updatePaymentMethod(method.id, {
                                config: { ...method.config, api_secret: e.target.value }
                              })
                            }
                            placeholder="API Secret"
                          />
                        </div>
                      </div>
                    )}

                    {method.name === "nagad" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Merchant ID</Label>
                          <Input
                            value={method.config.merchant_id || ""}
                            onChange={(e) =>
                              updatePaymentMethod(method.id, {
                                config: { ...method.config, merchant_id: e.target.value }
                              })
                            }
                            placeholder="Merchant ID"
                          />
                        </div>
                        <div>
                          <Label>Merchant Key</Label>
                          <Input
                            type="password"
                            value={method.config.merchant_key || ""}
                            onChange={(e) =>
                              updatePaymentMethod(method.id, {
                                config: { ...method.config, merchant_key: e.target.value }
                              })
                            }
                            placeholder="Merchant Key"
                          />
                        </div>
                      </div>
                    )}

                    {method.name === "manual" && (
                      <div>
                        <Label>Payment Instructions</Label>
                        <Textarea
                          value={method.config.instructions || ""}
                          onChange={(e) =>
                            updatePaymentMethod(method.id, {
                              config: { ...method.config, instructions: e.target.value }
                            })
                          }
                          placeholder="Enter instructions for manual payments..."
                          rows={3}
                        />
                        <div className="mt-4">
                          <Label>Payment Number</Label>
                          <Input
                            value={method.config.payment_number || ""}
                            onChange={(e) =>
                              updatePaymentMethod(method.id, {
                                config: { ...method.config, payment_number: e.target.value }
                              })
                            }
                            placeholder="Enter payment number (e.g., bKash/Nagad number)"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Label>Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Filter by Method</Label>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.id} value={method.id}>{method.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.profiles?.full_name || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">{transaction.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.amount} {transaction.currency}
                      </TableCell>
                      <TableCell>{transaction.payment_methods?.display_name}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>{transaction.credits_awarded}</TableCell>
                      <TableCell>
                        {transaction.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setCreditsToAward(Math.floor(transaction.amount));
                            }}
                          >
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedTransaction && (
        <Card>
          <CardHeader>
            <CardTitle>Review Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>User</Label>
                <p>{selectedTransaction.profiles?.full_name} ({selectedTransaction.profiles?.email})</p>
              </div>
              <div>
                <Label>Amount</Label>
                <p>{selectedTransaction.amount} {selectedTransaction.currency}</p>
              </div>
              <div>
                <Label>Transaction ID</Label>
                <p>{selectedTransaction.external_transaction_id || "N/A"}</p>
              </div>
              <div>
                <Label>Proof URL</Label>
                {selectedTransaction.proof_url ? (
                  <a 
                    href={selectedTransaction.proof_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Proof
                  </a>
                ) : (
                  <p>N/A</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="credits">Credits to Award</Label>
              <Input
                id="credits"
                type="number"
                value={creditsToAward}
                onChange={(e) => setCreditsToAward(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this payment..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => approvePayment("approved")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => approvePayment("rejected")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedTransaction(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}