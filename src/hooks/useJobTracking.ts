import { useState, useEffect, useCallback } from 'react';
import { DocumentProcessor, JobStatus } from '@/services/documentProcessor';
import { supabase } from '@/integrations/supabase/client';

export interface UseJobTrackingResult {
  jobStatus: JobStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useJobTracking = (jobId: string | null): UseJobTrackingResult => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await DocumentProcessor.getJobStatus(jobId);
      setJobStatus(status);
    } catch (err) {
      setError(err.message || 'Failed to fetch job status');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  // Initial fetch
  useEffect(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  // Set up real-time subscription for job updates
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel('job-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('Job updated:', payload);
          fetchJobStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, fetchJobStatus]);

  // Poll for updates if job is still processing
  useEffect(() => {
    if (!jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      fetchJobStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobStatus, fetchJobStatus]);

  return {
    jobStatus,
    isLoading,
    error,
    refetch: fetchJobStatus
  };
};