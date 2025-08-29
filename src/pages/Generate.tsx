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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Code, Copy, Download, Zap, Coins, Settings, TestTube, MessageSquare, Sparkles, History, RefreshCw } from 'lucide-react';
import { CodeViewer } from '@/components/ui/code-viewer';
import { CodeExplainer } from '@/components/features/CodeExplainer';
import { CodeOptimizer } from '@/components/features/CodeOptimizer';
import { CodeHistory } from '@/components/features/CodeHistory';

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
  'Node.js',
  'Flutter',
  'React Native'
];

const FRAMEWORKS = {
  'JavaScript': ['React', 'Vue.js', 'Angular', 'Express.js', 'Next.js'],
  'TypeScript': ['React', 'Vue.js', 'Angular', 'Express.js', 'Next.js', 'NestJS'],
  'Python': ['Django', 'Flask', 'FastAPI', 'Streamlit'],
  'Java': ['Spring Boot', 'Spring MVC', 'Hibernate'],
  'C#': ['.NET Core', 'ASP.NET', 'Entity Framework'],
  'PHP': ['Laravel', 'Symfony', 'CodeIgniter'],
  'Ruby': ['Ruby on Rails', 'Sinatra'],
  'Go': ['Gin', 'Echo', 'Fiber'],
  'Swift': ['SwiftUI', 'UIKit'],
  'Kotlin': ['Android', 'Spring Boot']
};

const COMPLEXITY_LEVELS = [
  { value: 'simple', label: 'Simple', description: 'Basic functionality with clear comments', credits: 1 },
  { value: 'intermediate', label: 'Intermediate', description: 'Well-structured with best practices', credits: 1 },
  { value: 'advanced', label: 'Advanced', description: 'Production-ready with optimization', credits: 2 }
];

const CODE_TEMPLATES = [
  { name: 'REST API Endpoint', prompt: 'Create a REST API endpoint for user management with CRUD operations', language: 'Node.js' },
  { name: 'React Component', prompt: 'Create a reusable React component for a data table with sorting and filtering', language: 'React' },
  { name: 'Database Schema', prompt: 'Design a database schema for an e-commerce application', language: 'SQL' },
  { name: 'Authentication System', prompt: 'Implement JWT-based authentication with login and registration', language: 'JavaScript' },
  { name: 'Data Processing', prompt: 'Create a data processing pipeline for CSV file analysis', language: 'Python' },
  { name: 'Mobile UI Component', prompt: 'Design a mobile-friendly card component with animations', language: 'Flutter' }
];

export default function Generate() {
  const { user, credits, refreshCredits } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('');
 const [framework, setFramework] = useState('none-selected');
  const [complexity, setComplexity] = useState('intermediate');
  const [includeTests, setIncludeTests] = useState(false);
  const [includeComments, setIncludeComments] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('generate');

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
        .limit(20);

      if (error) throw error;
      setGenerationHistory(data || []);
    } catch (error) {
      console.error('Error fetching generation history:', error);
    }
  };

  const calculateCredits = () => {
    const complexityLevel = COMPLEXITY_LEVELS.find(c => c.value === complexity);
    let total = complexityLevel?.credits || 1;
    if (includeTests) total += 1;
    if (framework) total += 1;
    return total;
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

    const requiredCredits = calculateCredits();
    if (!credits || credits.amount < requiredCredits) {
      toast({
        title: 'Insufficient Credits',
        description: `You need at least ${requiredCredits} credits for this generation`,
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { 
          prompt, 
          language, 
          complexity,
          includeTests,
          includeComments,
          framework: framework || undefined
        }
      });

      if (error) throw error;

      setGeneratedCode(data.code);
      toast({
        title: 'Success',
        description: `Code generated! Used ${data.credits_used} credits. ${data.remaining_credits} remaining.`,
      });

      // Refresh credits and generation history
      await refreshCredits();
      fetchGenerationHistory();
      
      // Switch to results tab
      setSelectedTab('results');
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
      'SQL': 'sql',
      'React': 'jsx',
      'Vue.js': 'vue',
      'Angular': 'ts',
      'Flutter': 'dart'
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
    setSelectedTab('results');
  };

  const useTemplate = (template: any) => {
    setPrompt(template.prompt);
    setLanguage(template.language);
    setSelectedTab('generate');
  };

  const regenerateCode = async () => {
    if (generatedCode) {
      await generateCode();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Code Generator</h1>
          <p className="text-muted-foreground">Generate high-quality code using advanced AI with enhanced features</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="generate">
                  <Code className="w-4 h-4 mr-2" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="results">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Templates
                </TabsTrigger>
              </TabsList>

              {/* Generate Tab */}
              <TabsContent value="generate" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Code Generation
                    </CardTitle>
                    <CardDescription>
                      Describe what you want to build and customize your preferences
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-primary" />
                        <span>Available: <strong>{credits?.amount || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-warning" />
                        <span>Cost: <strong>{calculateCredits()}</strong> credits</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="prompt">Describe what you want to build</Label>
                      <Textarea
                        id="prompt"
                        placeholder="e.g., Create a React component for a user profile card with avatar, name, email, and edit button. Include proper TypeScript types and responsive design."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="language">Programming Language</Label>
                        <Select value={language} onValueChange={(value) => {
                          setLanguage(value);
                          setFramework('none-selected'); // Reset framework when language changes
                        }}>
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
                        <Label htmlFor="framework">Framework (Optional)</Label>
                        <Select value={framework} onValueChange={(value) => {
                          setFramework(value === 'none-selected' ? '' : value);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select framework" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none-selected">None</SelectItem>
                            {language && FRAMEWORKS[language as keyof typeof FRAMEWORKS]?.map((fw) => (
                              <SelectItem key={fw} value={fw}>
                                {fw}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-medium">{level.label}</div>
                                  <div className="text-xs text-muted-foreground">{level.description}</div>
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {level.credits} credit{level.credits > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Advanced Options */}
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Advanced Options
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <TestTube className="w-4 h-4" />
                              Include Unit Tests
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Generate test cases for your code (+1 credit)
                            </p>
                          </div>
                          <Switch
                            checked={includeTests}
                            onCheckedChange={setIncludeTests}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Include Comments
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Add detailed code comments and documentation
                            </p>
                          </div>
                          <Switch
                            checked={includeComments}
                            onCheckedChange={setIncludeComments}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      onClick={generateCode}
                      disabled={isGenerating || !prompt.trim() || !language || (credits?.amount || 0) < calculateCredits()}
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
                          Generate Code ({calculateCredits()} Credit{calculateCredits() > 1 ? 's' : ''})
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="space-y-6">
                {generatedCode ? (
                  <div className="space-y-6">
                    <CodeViewer
                      code={generatedCode}
                      language={language}
                      title="Generated Code"
                      onCopy={copyToClipboard}
                      onDownload={downloadCode}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CodeExplainer code={generatedCode} language={language} />
                      <CodeOptimizer 
                        code={generatedCode} 
                        language={language}
                        onOptimizedCode={setGeneratedCode}
                      />
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No code generated yet</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setSelectedTab('generate')}
                      >
                        Start Generating
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Code Templates
                    </CardTitle>
                    <CardDescription>
                      Quick start with pre-built prompts for common use cases
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {CODE_TEMPLATES.map((template, index) => (
                        <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <Badge variant="outline">{template.language}</Badge>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                              {template.prompt}
                            </p>
                            <Button 
                              size="sm" 
                              onClick={() => useTemplate(template)}
                              className="w-full"
                            >
                              Use Template
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Credits Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{credits?.amount || 0}</div>
                  <p className="text-sm text-muted-foreground">Available Credits</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Generation:</span>
                    <span className="font-medium">{calculateCredits()} credits</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>After Generation:</span>
                    <span className="font-medium">{Math.max(0, (credits?.amount || 0) - calculateCredits())} credits</span>
                  </div>
                </div>

                {(credits?.amount || 0) < 10 && (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => window.open('/billing', '_blank')}
                  >
                    Buy More Credits
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* History Card */}
            <CodeHistory onLoadGeneration={loadGeneration} />
          </div>
        </div>
      </div>
    </div>
  );
}