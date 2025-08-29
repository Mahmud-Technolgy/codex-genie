import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Loader2 } from 'lucide-react';

interface CodeExplainerProps {
  code: string;
  language: string;
}

export const CodeExplainer: React.FC<CodeExplainerProps> = ({ code, language }) => {
  const { toast } = useToast();
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  const explainCode = async (question?: string) => {
    setIsExplaining(true);
    try {
      const prompt = question 
        ? `Explain this ${language} code and answer: "${question}"\n\nCode:\n${code}`
        : `Explain this ${language} code in detail, including what it does, how it works, and any important concepts:\n\nCode:\n${code}`;

      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { 
          prompt,
          language: 'explanation',
          complexity: 'simple'
        }
      });

      if (error) throw error;

      setExplanation(data.code);
      if (question) setCustomQuestion('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to explain code',
        variant: 'destructive',
      });
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Code Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => explainCode()} 
            disabled={isExplaining || !code}
            size="sm"
          >
            {isExplaining ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4 mr-2" />
            )}
            Explain Code
          </Button>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Ask a specific question about the code..."
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            rows={2}
          />
          <Button 
            onClick={() => explainCode(customQuestion)} 
            disabled={isExplaining || !code || !customQuestion.trim()}
            size="sm"
            variant="outline"
            className="w-full"
          >
            Ask Question
          </Button>
        </div>

        {explanation && (
          <div className="mt-4">
            <Badge variant="secondary" className="mb-2">Explanation</Badge>
            <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
              {explanation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};