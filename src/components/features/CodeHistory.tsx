import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { History, Search, Filter, Star, Trash2 } from 'lucide-react';

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

interface CodeHistoryProps {
  onLoadGeneration: (generation: Generation) => void;
}

export const CodeHistory: React.FC<CodeHistoryProps> = ({ onLoadGeneration }) => {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filteredGenerations, setFilteredGenerations] = useState<Generation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [loading, setLoading] = useState(true);

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
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
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
    } catch (error) {
      console.error('Error updating generation:', error);
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
    } catch (error) {
      console.error('Error deleting generation:', error);
    }
  };

  const uniqueLanguages = [...new Set(generations.map(gen => gen.language))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Code History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
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

        {/* Generations List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : filteredGenerations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm || languageFilter !== 'all' ? 'No matching generations' : 'No generations yet'}
            </div>
          ) : (
            filteredGenerations.map((generation) => (
              <div
                key={generation.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
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
                
                <p className="text-sm font-medium mb-2 line-clamp-2">{generation.prompt}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {generation.credits_used} credit{generation.credits_used > 1 ? 's' : ''} used
                  </span>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onLoadGeneration(generation)}
                    >
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePublic(generation.id, generation.is_public)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteGeneration(generation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};