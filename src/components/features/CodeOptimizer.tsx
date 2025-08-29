import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Zap, Loader2 } from 'lucide-react';

interface CodeOptimizerProps {
  code: string;
  language: string;
  onOptimizedCode: (optimizedCode: string) => void;
}

const OPTIMIZATION_TYPES = [
  { value: 'performance', label: 'Performance', description: 'Optimize for speed and efficiency' },
  { value: 'readability', label: 'Readability', description: 'Improve code clarity and maintainability' },
  { value: 'security', label: 'Security', description: 'Add security best practices' },
  { value: 'memory', label: 'Memory', description: 'Optimize memory usage' },
  { value: 'best-practices', label: 'Best Practices', description: 'Apply industry standards' }
];

export const CodeOptimizer: React.FC<CodeOptimizerProps> = ({ 
  code, 
  language, 
  onOptimizedCode 
}) => {
  const { toast } = useToast();
  const [optimizationType, setOptimizationType] = useState('performance');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeCode = async () => {
    setIsOptimizing(true);
    try {
      const optimizationDesc = OPTIMIZATION_TYPES.find(t => t.value === optimizationType)?.description;
      const prompt = `Optimize this ${language} code for ${optimizationDesc}. Return only the optimized code with comments explaining the improvements:\n\nOriginal Code:\n${code}`;

      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { 
          prompt,
          language,
          complexity: 'advanced'
        }
      });

      if (error) throw error;

      onOptimizedCode(data.code);
      toast({
        title: 'Code Optimized',
        description: `Code optimized for ${optimizationType}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to optimize code',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Code Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select value={optimizationType} onValueChange={setOptimizationType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPTIMIZATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={optimizeCode} 
          disabled={isOptimizing || !code}
          className="w-full"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Optimize Code (2 Credits)
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          <Badge variant="outline">Advanced Feature</Badge>
        </div>
      </CardContent>
    </Card>
  );
};