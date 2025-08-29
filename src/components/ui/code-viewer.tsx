import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeViewerProps {
  code: string;
  language: string;
  title?: string;
  onCopy?: () => void;
  onDownload?: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language,
  title = "Generated Code",
  onCopy,
  onDownload
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: 'Copied',
        description: 'Code copied to clipboard',
      });
      onCopy?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const lines = code.split('\n');

  return (
    <Card className={isExpanded ? 'fixed inset-4 z-50 bg-background' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="outline">{language}</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
            >
              {showLineNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className={`bg-muted p-4 rounded-lg overflow-auto text-sm ${
            isExpanded ? 'max-h-[calc(100vh-200px)]' : 'max-h-96'
          }`}>
            <code className="block">
              {showLineNumbers ? (
                <table className="w-full">
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td className="text-muted-foreground text-right pr-4 select-none w-8">
                          {index + 1}
                        </td>
                        <td className="whitespace-pre-wrap break-all">
                          {line || ' '}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="whitespace-pre-wrap break-all">{code}</div>
              )}
            </code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};