import { createWorker } from 'tesseract.js';

export interface ExtractedInvoiceData {
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vin: string;
  purchasePrice: string;
  gstAmount: string;
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
    }
    return this.worker;
  }

  static async extractTextFromFile(file: File): Promise<string> {
    const worker = await this.initializeWorker();
    
    try {
      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Convert file to image buffer for better compatibility
      const imageBuffer = await file.arrayBuffer();
      const { data: { text } } = await worker.recognize(new Uint8Array(imageBuffer));
      
      console.log('Extracted text length:', text.length);
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

    // Extract total/purchase price
    const priceMatch = text.match(/(?:Total|Amount)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (priceMatch) {
      data.purchasePrice = priceMatch[1];
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
    const vinMatch = text.match(/VIN[:\s]*([A-Z0-9]{17})/i);
    if (vinMatch) {
      data.vin = vinMatch[1];
    }

    // Extract vehicle make and model (look for common Australian car brands)
    const vehicleMatch = text.match(/(Toyota|Holden|Ford|Mazda|Honda|Nissan|Hyundai|Kia|Subaru|Mitsubishi|BMW|Mercedes|Audi|Volkswagen)\s+([A-Za-z0-9\s]+)/i);
    if (vehicleMatch) {
      data.vehicleMake = vehicleMatch[1];
      data.vehicleModel = vehicleMatch[2].trim();
    }

    // Extract year (4 digits, typically 2000-2025)
    const yearMatch = text.match(/(20\d{2})/);
    if (yearMatch) {
      data.vehicleYear = yearMatch[1];
    }

    // Extract vendor name (look for business name patterns)
    const vendorMatch = text.match(/([A-Z][a-z]+\s+[A-Za-z\s]*(?:Motors|Automotive|Cars|Dealership|Pty Ltd|Ltd))/i);
    if (vendorMatch) {
      data.vendorName = vendorMatch[1].trim();
    }

    return data;
  }

  static async processInvoice(file: File, onProgress?: (progress: number) => void): Promise<Partial<ExtractedInvoiceData>> {
    try {
      onProgress?.(25);
      const text = await this.extractTextFromFile(file);
      
      onProgress?.(75);
      const extractedData = this.parseAustralianInvoice(text);
      
      onProgress?.(100);
      return extractedData;
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