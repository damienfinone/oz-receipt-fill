import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker using Vite-compatible approach
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ExtractedInvoiceData {
  // Financial
  totalCost: string;
  deposit: string;
  purchasePrice: string;
  gstAmount: string;
  
  // Vehicle Details
  assetType: string;
  bodyType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  transmission: string;
  fuelType: string;
  color: string;
  engineNumber: string;
  
  // Identification
  vin: string;
  nvic: string;
  registration: string;
  state: string;
  
  // Vendor & Invoice
  vendorName: string;
  vendorAbn: string;
  purchaseDate: string;
  invoiceNumber: string;
}

export class OCRService {
  private static worker: any = null;

  static async initializeWorker() {
    if (!this.worker) {
      this.worker = await createWorker('eng');
      // Optimize Tesseract settings for speed
      await this.worker.setParameters({
        tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only (faster)
      });
    }
    return this.worker;
  }

  static async extractTextFromPdf(file: File): Promise<{ text: string | null; pdfDoc: any }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      // Extract text from all pages (most invoices are single page)
      const numPages = Math.min(pdf.numPages, 3); // Limit to first 3 pages for speed
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      const text = fullText.trim();
      // Return both text and PDF document for potential reuse
      return { 
        text: text.length > 20 ? text : null, // Lowered threshold for better detection
        pdfDoc: pdf 
      };
    } catch (error) {
      console.warn('PDF text extraction failed:', error);
      return { text: null, pdfDoc: null };
    }
  }

  static async convertPdfToImage(pdfDoc: any, fastMode: boolean = false): Promise<File> {
    // Get the first page
    const page = await pdfDoc.getPage(1);
    const scale = fastMode ? 1.0 : 1.5; // Further reduced scales for speed
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise;
    
    // Convert canvas to blob then to File
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const imageFile = new File([blob!], 'converted.png', { type: 'image/png' });
        resolve(imageFile);
      }, 'image/png', 0.85); // Lower quality for faster processing
    });
  }

  static isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  static async preprocessImage(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Create canvas for image preprocessing
    const blob = new Blob([imageBuffer]);
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply contrast and brightness adjustments
        const contrast = 1.2;
        const brightness = 10;
        
        for (let i = 0; i < data.length; i += 4) {
          // Apply contrast and brightness to RGB channels
          data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));     // Red
          data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)); // Green  
          data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)); // Blue
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert back to buffer
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(reject);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/png', 0.95);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  static async extractTextFromFile(file: File, usePreprocessing: boolean = true, fastMode: boolean = false): Promise<string> {
    try {
      const startTime = Date.now();
      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // FAST PATH: Try PDF text layer extraction first (if PDF)
      if (this.isPdfFile(file)) {
        console.log('Attempting fast PDF text extraction...');
        const { text: pdfText, pdfDoc } = await this.extractTextFromPdf(file);
        if (pdfText) {
          console.log(`Fast PDF text extraction successful in ${Date.now() - startTime}ms, text length:`, pdfText.length);
          return pdfText;
        }
        console.log('PDF has no meaningful text layer, converting to image for OCR...');
        
        // FALLBACK: OCR processing with cached PDF document
        const worker = await this.initializeWorker();
        const processedFile = await this.convertPdfToImage(pdfDoc, fastMode);
        console.log(`PDF converted to image in ${Date.now() - startTime}ms`);
        
        // Convert file to image buffer and process with OCR
        let imageBuffer = await processedFile.arrayBuffer();
        
        // Skip preprocessing in fast mode for speed
        if (usePreprocessing && !fastMode) {
          console.log('Applying image preprocessing...');
          imageBuffer = await this.preprocessImage(imageBuffer);
        }
        
        const { data: { text, confidence } } = await worker.recognize(new Uint8Array(imageBuffer));
        console.log(`OCR completed in ${Date.now() - startTime}ms, text length:`, text.length, 'confidence:', confidence);
        return text;
      }
      
      // IMAGE FILE processing
      const worker = await this.initializeWorker();
      let processedFile = file;
      
      // Convert file to image buffer
      let imageBuffer = await processedFile.arrayBuffer();
      
      // Apply image preprocessing if enabled (skip in fast mode for speed)
      if (usePreprocessing && !fastMode) {
        console.log('Applying image preprocessing...');
        imageBuffer = await this.preprocessImage(imageBuffer);
      }
      
      const { data: { text, confidence } } = await worker.recognize(new Uint8Array(imageBuffer));
      
      console.log(`Image OCR completed in ${Date.now() - startTime}ms, text length:`, text.length, 'confidence:', confidence);
      return text;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      console.error('File details:', { name: file.name, type: file.type, size: file.size });
      throw new Error(`Failed to extract text from document: ${error.message}`);
    }
  }

  static parseAustralianInvoice(text: string): Partial<ExtractedInvoiceData> {
    const data: Partial<ExtractedInvoiceData> = {};
    
    // Extract ABN (11 digits with spaces: XX XXX XXX XXX)
    const abnMatch = text.match(/ABN[:\s]*(\d{2}\s\d{3}\s\d{3}\s\d{3})/i);
    if (abnMatch) {
      data.vendorAbn = abnMatch[1];
    }

    // Extract GST amount (look for GST: $X,XXX.XX)
    const gstMatch = text.match(/GST[:\s]*\$?([\d,]+\.?\d*)/i);
    if (gstMatch) {
      data.gstAmount = gstMatch[1];
    }

    // Extract total cost (look for Total incl GST or Total)
    const totalMatch = text.match(/Total(?:\s+incl\s+GST)?[:\s]*\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      data.totalCost = totalMatch[1];
    }

    // Extract purchase price/subtotal
    const priceMatch = text.match(/(?:Sub\s*Total|Purchase\s*Price|Amount)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (priceMatch) {
      data.purchasePrice = priceMatch[1];
    }

    // Extract deposit
    const depositMatch = text.match(/(?:Deposit)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (depositMatch) {
      data.deposit = depositMatch[1];
    }

    // Extract invoice number
    const invoiceMatch = text.match(/(?:Invoice|Tax Invoice)[:\s#]*([A-Z0-9-]+)/i);
    if (invoiceMatch) {
      data.invoiceNumber = invoiceMatch[1];
    }

    // Extract date (various formats)
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split(/[\/\-]/);
      data.purchaseDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Extract VIN (17 characters, alphanumeric)
    const vinMatch = text.match(/(?:VIN|Chassis)[:\s]*([A-Z0-9]{17})/i);
    if (vinMatch) {
      data.vin = vinMatch[1];
    }

    // Extract vehicle make and model (look for common Australian car brands)
    const vehicleMatch = text.match(/(Toyota|Holden|Ford|Mazda|Honda|Nissan|Hyundai|Kia|Subaru|Mitsubishi|BMW|Mercedes|Audi|Volkswagen|BYD)\s+([A-Za-z0-9\s]+)/i);
    if (vehicleMatch) {
      data.vehicleMake = vehicleMatch[1];
      data.vehicleModel = vehicleMatch[2].trim();
    }

    // Extract year (4 digits, typically 2000-2025)
    const yearMatch = text.match(/(20\d{2})/);
    if (yearMatch) {
      data.vehicleYear = yearMatch[1];
    }

    // Extract body type
    const bodyTypeMatch = text.match(/Body\s*Type[:\s]*(Sedan|Hatchback|SUV|Wagon|Coupe|Convertible|Ute|Van)/i);
    if (bodyTypeMatch) {
      data.bodyType = bodyTypeMatch[1].toLowerCase();
    }

    // Extract transmission
    const transmissionMatch = text.match(/Transmission[:\s]*(Automatic|Manual|CVT)/i);
    if (transmissionMatch) {
      data.transmission = transmissionMatch[1].toLowerCase();
    }

    // Extract fuel type
    const fuelMatch = text.match(/Fuel\s*Type[:\s]*(Electric|Petrol|Diesel|Hybrid|Plug-in\s*Hybrid|LPG)/i);
    if (fuelMatch) {
      data.fuelType = fuelMatch[1].toLowerCase().replace(/\s+/g, '-');
    }

    // Extract color
    const colorMatch = text.match(/(?:Ext\.\s*Colour|Color|Paint)[:\s]*([A-Za-z0-9\s]+)/i);
    if (colorMatch) {
      data.color = colorMatch[1].trim();
    }

    // Extract engine number
    const engineMatch = text.match(/Engine\s*No[:\s]*([A-Z0-9\s]+)/i);
    if (engineMatch) {
      data.engineNumber = engineMatch[1].trim();
    }

    // Extract registration
    const regoMatch = text.match(/(?:Rego|Registration)\s*No[:\s]*([A-Z0-9]+)/i);
    if (regoMatch) {
      data.registration = regoMatch[1];
    }

    // Extract state
    const stateMatch = text.match(/(?:Rego\s*State|State)[:\s]*(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)/i);
    if (stateMatch) {
      data.state = stateMatch[1].toUpperCase();
    }

    // Extract vendor name (look for business name patterns)
    const vendorMatch = text.match(/([A-Z][a-z]+\s+[A-Za-z\s]*(?:Motors|Automotive|Cars|Dealership|Pty Ltd|Ltd))/i);
    if (vendorMatch) {
      data.vendorName = vendorMatch[1].trim();
    }

    return data;
  }

  static async processInvoice(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<{ 
    data: Partial<ExtractedInvoiceData>; 
    confidence: number; 
    fieldsWithLowConfidence: string[]; 
    documentAnalysis?: any;
    ocrText?: string;
  }> {
    try {
      onProgress?.(10);
      
      // Start document analysis in parallel (non-blocking)
      let documentAnalysisPromise: Promise<any> | null = null;
      try {
        const { DocumentAnalysisService } = await import('./documentAnalysisService');
        documentAnalysisPromise = DocumentAnalysisService.analyzeDocument(file);
      } catch (error) {
        console.warn('Document analysis service not available:', error);
      }
      
      // Smart extraction: Optimized single-pass processing
      console.log('Starting text extraction...');
      const extractionStart = Date.now();
      
      // Use smart fast mode - no preprocessing, optimized settings
      let text = await this.extractTextFromFile(file, false, true);
      
      console.log(`Text extraction completed in ${Date.now() - extractionStart}ms, text length:`, text.length);
      
      // Only retry if text is extremely short (likely complete failure)
      if (text.length < 20 && !this.isPdfFile(file)) {
        console.log('Text extraction failed, retrying with preprocessing...');
        text = await this.extractTextFromFile(file, true, false);
      }
      onProgress?.(35);
      
      console.log('Using AI-enhanced parsing via edge function...');
      
      try {
        // Import supabase client dynamically to use in the service
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Call the edge function for AI parsing
        const { data: aiResult, error } = await supabase.functions.invoke('parse-invoice', {
          body: { text }
        });
        
        if (error) {
          console.warn('Edge function error, falling back to regex:', error);
          throw new Error('Edge function failed');
        }
        
        if (aiResult && aiResult.confidence > 0) {
          console.log('AI parsing successful:', aiResult);
          console.log('AI data structure:', JSON.stringify(aiResult.data, null, 2));
          
          // Wait for document analysis to complete and include it
          let documentAnalysis = null;
          if (documentAnalysisPromise) {
            try {
              documentAnalysis = await documentAnalysisPromise;
              
              // Compare OCR text with text layer if available
              if (documentAnalysis?.textLayerText) {
                const { DocumentAnalysisService } = await import('./documentAnalysisService');
                const comparison = DocumentAnalysisService.compareOcrWithTextLayer(
                  text, 
                  documentAnalysis.textLayerText
                );
                documentAnalysis.suspiciousIndicators.push(...comparison.indicators);
              }
            } catch (error) {
              console.warn('Document analysis failed:', error);
            }
          }
          
          onProgress?.(90);
          onProgress?.(100);
          return {
            ...aiResult,
            documentAnalysis,
            ocrText: text
          };
        }
      } catch (aiError) {
        console.warn('AI parsing failed, falling back to regex:', aiError);
      }
      
      // Fallback to local regex parsing
      console.log('Using local regex parsing...');
      const extractedData = this.parseAustralianInvoice(text);
      
      // Wait for document analysis to complete
      let documentAnalysis = null;
      if (documentAnalysisPromise) {
        try {
          documentAnalysis = await documentAnalysisPromise;
          
          // Compare OCR text with text layer if available
          if (documentAnalysis?.textLayerText) {
            const { DocumentAnalysisService } = await import('./documentAnalysisService');
            const comparison = DocumentAnalysisService.compareOcrWithTextLayer(
              text, 
              documentAnalysis.textLayerText
            );
            documentAnalysis.suspiciousIndicators.push(...comparison.indicators);
          }
        } catch (error) {
          console.warn('Document analysis failed:', error);
        }
      }
      
      const result = {
        data: extractedData,
        confidence: 60,
        fieldsWithLowConfidence: Object.keys(extractedData).filter(key => 
          !extractedData[key as keyof ExtractedInvoiceData] || 
          String(extractedData[key as keyof ExtractedInvoiceData]).length < 2
        ),
        documentAnalysis,
        ocrText: text
      };
      
      onProgress?.(90);
      onProgress?.(100);
      return result;
    } catch (error) {
      console.error('Invoice processing failed:', error);
      throw error;
    }
  }

  static async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}