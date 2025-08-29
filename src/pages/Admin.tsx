import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Settings, Users, Code, Key, Activity, CreditCard } from 'lucide-react';
import PaymentManagement from '@/components/admin/PaymentManagement';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_banned: boolean;
  created_at: string;
}

interface CodeGeneration {
  id: string;
  user_id: string;
  prompt: string;
  language: string;
  credits_used: number;
  created_at: string;
  profiles: { email: string; full_name: string } | null;
}

interface AdminStats {
  totalUsers: number;
  totalGenerations: number;
  totalCreditsUsed: number;
  activeToday: number;
}

export default function Admin() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [generations, setGenerations] = useState<CodeGeneration[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalGenerations: 0,
    totalCreditsUsed: 0,
    activeToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);

  // Check if user is admin
  if (!user || !profile || profile.role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch recent generations with user info
      const { data: generationsData, error: generationsError } = await supabase
        .from('code_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (generationsError) throw generationsError;

      // Fetch profiles separately to avoid join issues
      const userIds = [...new Set(generationsData?.map(g => g.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      // Combine data
      const generationsWithProfiles = (generationsData || []).map(generation => ({
        ...generation,
        profiles: profilesData?.find(p => p.user_id === generation.user_id) || null
      }));

      setGenerations(generationsWithProfiles);

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalGenerations = generationsData?.length || 0;
      const totalCreditsUsed = generationsData?.reduce((sum, gen) => sum + gen.credits_used, 0) || 0;
      
      // Count active users today
      const today = new Date().toISOString().split('T')[0];
      const { data: activeData } = await supabase
        .from('code_generations')
        .select('user_id')
        .gte('created_at', today);
      
      const activeToday = new Set(activeData?.map(item => item.user_id)).size;

      setStats({
        totalUsers,
        totalGenerations,
        totalCreditsUsed,
        activeToday
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch admin data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGeminiApiKey = async () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid API key',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingKey(true);
    try {
      // Call edge function to update the secret
      const { error } = await supabase.functions.invoke('update-api-key', {
        body: { key: 'GEMINI_API_KEY', value: geminiApiKey }
      });
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Gemini API key updated successfully',
      });

      // Log admin action (this will be handled by the edge function)
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'update_api_key',
        details: { key: 'GEMINI_API_KEY' }
      });

      setGeminiApiKey('');
      
    } catch (error) {
      console.error('Error updating API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to update API key',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const toggleUserBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentBanStatus })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_banned: !currentBanStatus }
          : user
      ));

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: currentBanStatus ? 'unban_user' : 'ban_user',
        target_user_id: userId
      });

      toast({
        title: 'Success',
        description: `User ${currentBanStatus ? 'unbanned' : 'banned'} successfully`,
      });

    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage system settings and monitor user activity</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGenerations}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCreditsUsed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeToday}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="generations">
              <Code className="w-4 h-4 mr-2" />
              Generations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Key Management
                </CardTitle>
                <CardDescription>
                  Manage the Gemini API key used for code generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">Gemini API Key</Label>
                  <Input
                    id="gemini-key"
                    type="password"
                    placeholder="Enter new Gemini API key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={updateGeminiApiKey}
                  disabled={isUpdatingKey || !geminiApiKey.trim()}
                >
                  {isUpdatingKey ? 'Updating...' : 'Update API Key'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage all registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.full_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_banned ? 'destructive' : 'default'}>
                            {user.is_banned ? 'Banned' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.role !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserBan(user.id, user.is_banned)}
                            >
                              {user.is_banned ? 'Unban' : 'Ban'}
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

          <TabsContent value="payments" className="space-y-6">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="generations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Code Generations</CardTitle>
                <CardDescription>
                  Monitor recent code generation activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generations.map((generation) => (
                      <TableRow key={generation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{generation.profiles?.full_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{generation.profiles?.email || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{generation.language}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {generation.prompt}
                        </TableCell>
                        <TableCell>{generation.credits_used}</TableCell>
                        <TableCell>
                          {new Date(generation.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}