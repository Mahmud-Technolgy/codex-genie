import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, 
  Zap, 
  TrendingUp, 
  Users, 
  Award, 
  Copy,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecentGeneration {
  id: string;
  prompt: string;
  language: string;
  created_at: string;
  credits_used: number;
}

interface DashboardStats {
  totalGenerations: number;
  totalCreditsUsed: number;
  favoriteLanguage: string;
  referralCount: number;
}

export default function Dashboard() {
  const { user, profile, credits, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentGenerations();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchRecentGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from('code_generations')
        .select('id, prompt, language, created_at, credits_used')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentGenerations(data || []);
    } catch (error) {
      console.error('Error fetching recent generations:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      
      // Fetch generations count and total credits used
      const { data: generations, error: genError } = await supabase
        .from('code_generations')
        .select('language, credits_used')
        .eq('user_id', user?.id);

      if (genError) throw genError;

      // Fetch referral count
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', user?.id);

      if (refError) throw refError;

      // Calculate stats
      const totalGenerations = generations?.length || 0;
      const totalCreditsUsed = generations?.reduce((sum, gen) => sum + gen.credits_used, 0) || 0;
      
      // Find most used language
      const languageCount: Record<string, number> = {};
      generations?.forEach(gen => {
        languageCount[gen.language] = (languageCount[gen.language] || 0) + 1;
      });
      
      const favoriteLanguage = Object.keys(languageCount).reduce((a, b) => 
        languageCount[a] > languageCount[b] ? a : b, 'JavaScript'
      );

      setStats({
        totalGenerations,
        totalCreditsUsed,
        favoriteLanguage,
        referralCount: referrals?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: "Referral code copied!",
        description: "Share it with friends to earn bonus credits.",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                Welcome back, {profile?.full_name || 'Developer'}! 👋
              </h1>
              <p className="text-muted-foreground mt-2">
                Ready to generate some amazing code today?
              </p>
            </div>
            <Button size="lg" onClick={() => navigate('/generate')} className="glow-border">
              <Plus className="mr-2 h-4 w-4" />
              Generate Code
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
              <Zap className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {credits?.amount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {credits && credits.amount < 10 ? 'Consider buying more' : 'You\'re all set!'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
              <Code2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalGenerations || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Code snippets created
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalCreditsUsed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total credits spent
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <Users className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.referralCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Friends referred
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Generations */}
          <Card className="lg:col-span-2 glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code2 className="h-5 w-5" />
                <span>Recent Generations</span>
              </CardTitle>
              <CardDescription>
                Your latest AI-generated code snippets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentGenerations.length > 0 ? (
                <div className="space-y-4">
                  {recentGenerations.map((generation) => (
                    <div key={generation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate max-w-xs">
                          {generation.prompt}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {generation.language}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {generation.credits_used} credits
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(generation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/generation/${generation.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No generations yet</p>
                  <Button className="mt-4" onClick={() => navigate('/generate')}>
                    Create Your First Generation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Account Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plan</span>
                  <Badge variant={profile?.role === 'premium' ? 'default' : 'secondary'}>
                    {profile?.role?.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Favorite Language</span>
                  <Badge variant="outline">
                    {statsLoading ? '...' : stats?.favoriteLanguage || 'N/A'}
                  </Badge>
                </div>

                {profile?.role !== 'premium' && (
                  <Button 
                    className="w-full" 
                    onClick={() => navigate('/billing')}
                  >
                    Upgrade to Premium
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Referral */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Refer Friends</span>
                </CardTitle>
                <CardDescription>
                  Earn 50 credits for each friend who joins!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Your Referral Code</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                      {profile?.referral_code}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyReferralCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    You've referred {stats?.referralCount || 0} friends
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}