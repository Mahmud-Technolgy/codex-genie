import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Users,
  CreditCard,
  Activity,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalUsers: number;
  pendingPayments: number;
  totalCreditsIssued: number;
  recentActivity: number;
}

export function AdminDrawer() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingPayments: 0,
    totalCreditsIssued: 0,
    recentActivity: 0,
  });

  // Only show for admin users
  if (profile?.role !== 'admin') {
    return null;
  }

  const fetchAdminStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get pending payments
      const { count: pendingCount } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get total credits issued
      const { data: creditsData } = await supabase
        .from('credit_transactions')
        .select('amount')
        .gt('amount', 0);

      const totalCredits = creditsData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: activityCount } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      setStats({
        totalUsers: userCount || 0,
        pendingPayments: pendingCount || 0,
        totalCreditsIssued: totalCredits,
        recentActivity: activityCount || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminStats();
    }
  }, [isOpen]);

  const adminSections = [
    {
      title: "User Management",
      icon: Users,
      description: "Manage users, roles, and permissions",
      action: () => navigate("/admin"),
      highlight: false,
    },
    {
      title: "Payment Management",
      icon: CreditCard,
      description: "Review and approve payments",
      action: () => navigate("/admin"),
      highlight: stats.pendingPayments > 0,
      badge: stats.pendingPayments > 0 ? stats.pendingPayments : undefined,
    },
    {
      title: "System Settings",
      icon: Settings,
      description: "Configure system settings",
      action: () => navigate("/admin"),
      highlight: false,
    },
    {
      title: "Activity Logs",
      icon: FileText,
      description: "View system activity and logs",
      action: () => navigate("/admin"),
      highlight: false,
    },
  ];

  // Keyboard shortcut (Ctrl/Cmd + A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element;
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !target?.closest('input, textarea')) {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 bg-primary hover:bg-primary/90 animate-pulse-glow"
          title="Admin Panel (Ctrl/Cmd + A)"
        >
          <Settings className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader className="text-center">
          <DrawerTitle className="flex items-center justify-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Admin Panel
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-6 pb-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending Payments</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stats.pendingPayments}</p>
                  {stats.pendingPayments > 0 && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Credits Issued</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold">{stats.totalCreditsIssued.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold">{stats.recentActivity}</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h3>
            
            {adminSections.map((section, index) => (
              <Button
                key={index}
                variant="ghost"
                className={`w-full justify-between p-4 h-auto ${
                  section.highlight ? 'bg-warning/10 hover:bg-warning/20 border border-warning/20' : ''
                }`}
                onClick={() => {
                  section.action();
                  setIsOpen(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <section.icon className={`h-5 w-5 mt-0.5 ${
                    section.highlight ? 'text-warning' : 'text-muted-foreground'
                  }`} />
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{section.title}</p>
                      {section.badge && (
                        <Badge variant="destructive" className="text-xs">
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </div>

          {/* System Status */}
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">System Status: Online</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  );
}