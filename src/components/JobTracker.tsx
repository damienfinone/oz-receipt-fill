import { useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useJobTracking } from '@/hooks/useJobTracking';
import { useToast } from '@/hooks/use-toast';

interface JobTrackerProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export const JobTracker = ({ jobId, onComplete, onError }: JobTrackerProps) => {
  const { jobStatus, isLoading, error } = useJobTracking(jobId);
  const { toast } = useToast();

  const getStageDisplay = (stage: string) => {
    switch (stage) {
      case 'upload': return 'Uploading document';
      case 'extract': return 'Extracting text';
      case 'analyze': return 'Analyzing with AI';
      case 'complete': return 'Processing complete';
      default: return 'Processing';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'processing': return 'secondary';
      default: return 'outline';
    }
  };

  const formatETA = (etaSeconds: number | undefined) => {
    if (!etaSeconds) return null;
    
    if (etaSeconds < 60) {
      return `~${etaSeconds}s remaining`;
    } else {
      const minutes = Math.ceil(etaSeconds / 60);
      return `~${minutes}m remaining`;
    }
  };

  // Handle job completion
  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus.result) {
      toast({
        title: "Document processed successfully",
        description: "Your invoice has been analyzed and extracted.",
      });
      onComplete?.(jobStatus.result);
    } else if (jobStatus?.status === 'failed') {
      toast({
        title: "Processing failed",
        description: jobStatus.error || "An error occurred while processing your document.",
        variant: "destructive",
      });
      onError?.(jobStatus.error || 'Processing failed');
    }
  }, [jobStatus, onComplete, onError, toast]);

  if (isLoading && !jobStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Failed to load job status: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jobStatus) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(jobStatus.status)}
            <span>Processing Document</span>
          </div>
          <Badge variant={getStatusColor(jobStatus.status)}>
            {jobStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {getStageDisplay(jobStatus.stage)}
            </span>
            <span className="text-muted-foreground">
              {Math.round(jobStatus.progress)}%
            </span>
          </div>
          <Progress value={jobStatus.progress} className="w-full" />
        </div>

        {jobStatus.etaSeconds && jobStatus.status === 'processing' && (
          <div className="text-sm text-muted-foreground">
            {formatETA(jobStatus.etaSeconds)}
          </div>
        )}

        {jobStatus.elapsedMs > 0 && (
          <div className="text-sm text-muted-foreground">
            Elapsed: {Math.round(jobStatus.elapsedMs / 1000)}s
          </div>
        )}

        {jobStatus.status === 'completed' && jobStatus.result && (
          <Button 
            onClick={() => onComplete?.(jobStatus.result)}
            className="w-full"
          >
            View Results
          </Button>
        )}

        {jobStatus.status === 'failed' && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              {jobStatus.error || 'An unknown error occurred'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};