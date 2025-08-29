import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CodeViewer } from '@/components/ui/code-viewer';
import { toast } from '@/hooks/use-toast';
import { History, Search, Filter, Star, Trash2, Eye, Download } from 'lucide-react';

interface Generation {
  id: string;
  prompt: string;
  language: string;
  generated_code: string;
  credits_used: number;
  created_at: string;
  is_public: boolean;
  like_count: number;
}

export default function History() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filteredGenerations, setFilteredGenerations] = useState<Generation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchGenerations();
  }, []);

  useEffect(() => {
    filterGenerations();
  }, [generations, searchTerm, languageFilter]);

  const fetchGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from('code_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load generation history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterGenerations = () => {
    let filtered = generations;

    if (searchTerm) {
      filtered = filtered.filter(gen => 
        gen.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gen.language.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(gen => gen.language === languageFilter);
    }

    setFilteredGenerations(filtered);
  };

  const togglePublic = async (generationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('code_generations')
        .update({ is_public: !currentStatus })
        .eq('id', generationId);

      if (error) throw error;

      setGenerations(generations.map(gen => 
        gen.id === generationId 
          ? { ...gen, is_public: !currentStatus }
          : gen
      ));

      toast({
        title: 'Success',
        description: `Generation ${!currentStatus ? 'made public' : 'made private'}`,
      });
    } catch (error) {
      console.error('Error updating generation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update generation',
        variant: 'destructive',
      });
    }
  };

  const deleteGeneration = async (generationId: string) => {
    try {
      const { error } = await supabase
        .from('code_generations')
        .delete()
        .eq('id', generationId);

      if (error) throw error;

      setGenerations(generations.filter(gen => gen.id !== generationId));
      if (selectedGeneration?.id === generationId) {
        setSelectedGeneration(null);
      }

      toast({
        title: 'Success',
        description: 'Generation deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting generation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete generation',
        variant: 'destructive',
      });
    }
  };

  const downloadCode = (generation: Generation) => {
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

    const extension = fileExtensions[generation.language] || 'txt';
    const blob = new Blob([generation.generated_code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generation.prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Code file downloaded successfully',
    });
  };

  const uniqueLanguages = [...new Set(generations.map(gen => gen.language))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Generation History</h1>
          <p className="text-muted-foreground">View and manage your AI-generated code snippets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* History List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search generations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {uniqueLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Generations List */}
            <div className="space-y-4">
              {filteredGenerations.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || languageFilter !== 'all' ? 'No matching generations' : 'No generations yet'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredGenerations.map((generation) => (
                  <Card 
                    key={generation.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedGeneration?.id === generation.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedGeneration(generation)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{generation.language}</Badge>
                          {generation.is_public && (
                            <Badge variant="secondary">Public</Badge>
                          )}
                          {generation.like_count > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {generation.like_count}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(generation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <CardTitle className="text-lg line-clamp-2">{generation.prompt}</CardTitle>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {generation.credits_used} credit{generation.credits_used > 1 ? 's' : ''} used
                        </span>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGeneration(generation);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadCode(generation);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePublic(generation.id, generation.is_public);
                            }}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGeneration(generation.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="space-y-6">
            {selectedGeneration ? (
              <CodeViewer
                code={selectedGeneration.generated_code}
                language={selectedGeneration.language}
                title={`${selectedGeneration.language} Code`}
                onDownload={() => downloadCode(selectedGeneration)}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a generation to view the code</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}