import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import { OCRService } from './ocrService';
import { FraudDetectionService } from './fraudDetectionService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ProcessingResult {
  jobId: string;
  mode: 'sync' | 'async';
  status: 'completed' | 'processing' | 'failed';
  result?: any;
  confidence?: number;
  elapsedMs?: number;
  stage?: string;
  etaSeconds?: number;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: 'upload' | 'extract' | 'analyze' | 'complete';
  progress: number;
  elapsedMs: number;
  etaSeconds?: number;
  result?: any;
  error?: string;
}

export class DocumentProcessor {
  private static readonly SYNC_THRESHOLD_MS = 10000; // 10 seconds
  private static readonly MAX_PAGES_SYNC = 3;

  /**
   * Detects if PDF has a text layer (embedded text)
   */
  static async hasTextLayer(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Check first few pages for text content
      const maxPagesToCheck = Math.min(pdf.numPages, 3);
      
      for (let pageNum = 1; pageNum <= maxPagesToCheck; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        if (textContent.items.length > 0) {
          // Check if we have meaningful text (not just whitespace/symbols)
          const text = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          
          if (text.length > 10) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking text layer:', error);
      return false;
    }
  }

  /**
   * Extracts text from PDF using text layer
   */
  static async extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  }

  /**
   * Calculates processing time estimate
   */
  static estimateProcessingTime(file: File, hasTextLayer: boolean, pageCount: number): number {
    let estimate = 0;
    
    // Base processing time
    estimate += 500; // Base overhead
    
    if (hasTextLayer) {
      // Text extraction: ~100ms per page
      estimate += pageCount * 100;
    } else {
      // OCR: ~1000ms per page
      estimate += pageCount * 1000;
    }
    
    // LLM processing: ~500ms per 1000 characters (estimate)
    const estimatedChars = pageCount * 1000; // Rough estimate
    estimate += Math.ceil(estimatedChars / 1000) * 500;
    
    return estimate;
  }

  /**
   * Gets PDF page count
   */
  static async getPageCount(file: File): Promise<number> {
    try {
      if (!file.type.includes('pdf')) return 1;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return pdf.numPages;
    } catch (error) {
      console.warn('Error getting page count:', error);
      return 1;
    }
  }

  /**
   * Creates a job record in the database (with type workaround)
   */
  static async createJob(fileId: string, mode: 'sync' | 'async'): Promise<string> {
    const jobId = crypto.randomUUID();
    
    try {
      // Use raw Supabase query until types are updated
      const { error } = await (supabase as any).rpc('create_job', {
        p_job_id: jobId,
        p_file_id: fileId,
        p_mode: mode
      });
      
      if (error) {
        console.warn('RPC failed, trying direct insert:', error);
        // Fallback to direct insert with type assertion
        const { error: insertError } = await (supabase as any)
          .from('jobs')
          .insert({
            job_id: jobId,
            file_id: fileId,
            mode,
            status: 'pending',
            stage: 'upload',
            progress: 0,
            elapsed_ms: 0
          });
        
        if (insertError) {
          throw new Error(`Failed to create job: ${insertError.message}`);
        }
      }
    } catch (err) {
      console.warn('Job creation failed, continuing with sync processing');
      // If database operations fail, continue with sync processing
    }
    
    return jobId;
  }

  /**
   * Main processing function with sync/async routing
   */
  static async processDocument(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      onProgress?.(10);
      
      // Analyze document characteristics
      const pageCount = await this.getPageCount(file);
      const hasText = file.type.includes('pdf') ? await this.hasTextLayer(file) : false;
      const estimatedTime = this.estimateProcessingTime(file, hasText, pageCount);
      
      console.log(`Document analysis: pages=${pageCount}, hasText=${hasText}, estimatedTime=${estimatedTime}ms`);
      
      // Determine processing mode
      const shouldProcessSync = estimatedTime < this.SYNC_THRESHOLD_MS && pageCount <= this.MAX_PAGES_SYNC;
      const mode = shouldProcessSync ? 'sync' : 'async';
      
      if (mode === 'sync') {
        // Process synchronously
        const result = await this.processSynchronously(file, hasText, onProgress);
        const elapsedMs = Date.now() - startTime;
        
        return {
          jobId: crypto.randomUUID(), // Generate ID for consistency
          mode: 'sync',
          status: 'completed',
          result: result.data,
          confidence: result.confidence,
          elapsedMs
        };
        
      } else {
        // For async, create job and return tracking info
        const jobId = await this.createJob(crypto.randomUUID(), 'async');
        
        // Start async processing (fire and forget)
        this.processAsynchronously(file, jobId, hasText);
        
        return {
          jobId,
          mode: 'async',
          status: 'processing',
          stage: 'extract',
          etaSeconds: Math.ceil(estimatedTime / 1000)
        };
      }
      
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }

  /**
   * Synchronous processing for small documents
   */
  private static async processSynchronously(
    file: File,
    hasTextLayer: boolean,
    onProgress?: (progress: number) => void
  ): Promise<{ data: any; confidence: number }> {
    
    let text: string;
    
    if (hasTextLayer && file.type.includes('pdf')) {
      text = await this.extractTextFromPdf(file);
    } else {
      text = await OCRService.extractTextFromFile(file, true);
    }
    
    onProgress?.(50);
    
    // Use AI parsing service
    try {
      const { data: aiResult, error } = await supabase.functions.invoke('parse-invoice', {
        body: { text }
      });
      
      if (!error && aiResult && aiResult.confidence > 0) {
        onProgress?.(90);
        
        // Run fraud detection
        const fraudAnalysis = FraudDetectionService.analyzeInvoice(aiResult.data, aiResult.confidence);
        
        return {
          data: {
            ...aiResult.data,
            fraudAnalysis
          },
          confidence: aiResult.confidence
        };
      }
    } catch (error) {
      console.warn('AI parsing failed, using fallback:', error);
    }
    
    // Fallback to regex parsing
    const extractedData = OCRService.parseAustralianInvoice(text);
    const fraudAnalysis = FraudDetectionService.analyzeInvoice(extractedData, 60);
    
    return {
      data: {
        ...extractedData,
        fraudAnalysis
      },
      confidence: 60
    };
  }

  /**
   * Asynchronous processing for large documents
   */
  private static async processAsynchronously(
    file: File,
    jobId: string,
    hasTextLayer: boolean
  ): Promise<void> {
    // This will be handled by the edge function
    try {
      const { error } = await supabase.functions.invoke('process-document-async', {
        body: {
          jobId,
          fileData: await this.fileToBase64(file),
          fileName: file.name,
          fileType: file.type,
          hasTextLayer
        }
      });
      
      if (error) {
        console.error('Failed to start async processing:', error);
      }
    } catch (error) {
      console.error('Failed to start async processing:', error);
    }
  }

  /**
   * Gets job status (with type workaround)
   */
  static async getJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      // Use type assertion until types are updated
      const { data, error } = await (supabase as any)
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        jobId: data.job_id,
        status: data.status,
        stage: data.stage || 'upload',
        progress: data.progress || 0,
        elapsedMs: data.elapsed_ms || 0,
        etaSeconds: data.eta_seconds,
        result: null, // Would need to join with results table
        error: data.error_message
      };
    } catch (error) {
      console.error('Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Utility functions
   */
  private static async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}