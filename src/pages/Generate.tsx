import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Code, Copy, Download, Zap, Coins } from 'lucide-react';

const PROGRAMMING_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'PHP',
  'Ruby',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'HTML/CSS',
  'SQL',
  'React',
  'Vue.js',
  'Angular',
  'Node.js'
];

const COMPLEXITY_LEVELS = [
  { value: 'simple', label: 'Simple', description: 'Basic functionality with clear comments' },
  { value: 'intermediate', label: 'Intermediate', description: 'Well-structured with best practices' },
  { value: 'advanced', label: 'Advanced', description: 'Production-ready with optimization' }
];

export default function Generate() {
  const { user, credits } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('');
  const [complexity, setComplexity] = useState('intermediate');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchGenerationHistory();
  }, []);

  const fetchGenerationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('code_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGenerationHistory(data || []);
    } catch (error) {
      console.error('Error fetching generation history:', error);
    }
  };

  const generateCode = async () => {
    if (!prompt.trim() || !language) {
      toast({
        title: 'Error',
        description: 'Please provide both a prompt and select a language',
        variant: 'destructive',
      });
      return;
    }

    if (!credits || credits.amount < 1) {
      toast({
        title: 'Insufficient Credits',
        description: 'You need at least 1 credit to generate code',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { prompt, language, complexity }
      });

      if (error) throw error;

      setGeneratedCode(data.code);
      toast({
        title: 'Success',
        description: `Code generated! ${data.remaining_credits} credits remaining`,
      });

      // Refresh generation history
      fetchGenerationHistory();
      
      // Clear form
      setPrompt('');
    } catch (error: any) {
      console.error('Error generating code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate code',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast({
        title: 'Copied',
        description: 'Code copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const downloadCode = () => {
    const fileExtensions: { [key: string]: string } = {
      'JavaScript': 'js',
      'TypeScript': 'ts',
      'Python': 'py',
      'Java': 'java',
      'C++': 'cpp',
      'C#': 'cs',
      'PHP': 'php',
      'Ruby': 'rb',
      'Go': 'go',
      'Rust': 'rs',
      'Swift': 'swift',
      'Kotlin': 'kt',
      'HTML/CSS': 'html',
      'SQL': 'sql'
    };

    const extension = fileExtensions[language] || 'txt';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Code file downloaded successfully',
    });
  };

  const loadGeneration = (generation: any) => {
    setPrompt(generation.prompt);
    setLanguage(generation.language);
    setGeneratedCode(generation.generated_code);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Code Generator</h1>
          <p className="text-muted-foreground">Generate high-quality code using advanced AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Code Generation
                </CardTitle>
                <CardDescription>
                  Describe what you want to build and select your preferences
                </CardDescription>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span>Available Credits: <strong>{credits?.amount || 0}</strong></span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe what you want to build</Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., Create a React component for a user profile card with avatar, name, email, and edit button"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Programming Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRAMMING_LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complexity">Complexity Level</Label>
                    <Select value={complexity} onValueChange={setComplexity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLEXITY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div>
                              <div className="font-medium">{level.label}</div>
                              <div className="text-xs text-muted-foreground">{level.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={generateCode}
                  disabled={isGenerating || !prompt.trim() || !language || (credits?.amount || 0) < 1}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Code (1 Credit)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Code Section */}
            {generatedCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Generated Code
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadCode}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{generatedCode}</code>
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Generations</CardTitle>
                <CardDescription>
                  Your code generation history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {generationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No generations yet
                  </p>
                ) : (
                  generationHistory.map((generation) => (
                    <div
                      key={generation.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => loadGeneration(generation)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{generation.language}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(generation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{generation.prompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {generation.credits_used} credit used
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}