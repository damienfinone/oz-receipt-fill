import OpenAI from 'openai';
import { ExtractedInvoiceData } from './ocrService';

export interface ParsedResult {
  data: Partial<ExtractedInvoiceData>;
  confidence: number;
  fieldsWithLowConfidence: string[];
}

export class AIParsingService {
  private static openai: OpenAI | null = null;

  static initializeOpenAI(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  static isInitialized(): boolean {
    return this.openai !== null;
  }

  static async parseInvoiceText(text: string): Promise<ParsedResult> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized. Please provide API key.');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting structured data from Australian vehicle invoices and tax invoices. 
            
            Extract the following information from the invoice text and return a JSON response with:
            1. The extracted data in the specified format
            2. A confidence score (0-100) for the overall extraction
            3. A list of field names where confidence is below 80%

            Expected fields:
            - vehicleMake: Car manufacturer (Toyota, Holden, Ford, etc.)
            - vehicleModel: Model name
            - vehicleYear: Year (YYYY format)
            - vin: Vehicle Identification Number (17 characters)
            - purchasePrice: Total purchase amount (numbers only, no currency symbols)
            - gstAmount: GST amount (numbers only)
            - vendorName: Business/dealer name
            - vendorAbn: Australian Business Number (format: XX XXX XXX XXX)
            - purchaseDate: Date in YYYY-MM-DD format
            - invoiceNumber: Invoice/receipt number

            For Australian formats:
            - Dates can be DD/MM/YYYY or DD-MM-YYYY (convert to YYYY-MM-DD)
            - ABN format: XX XXX XXX XXX (11 digits with spaces)
            - Currency amounts: remove $ and commas, keep decimal points
            
            Return ONLY a JSON object with this structure:
            {
              "data": { extracted fields here },
              "confidence": number,
              "fieldsWithLowConfidence": ["fieldName1", "fieldName2"]
            }`
          },
          {
            role: "user",
            content: `Extract data from this Australian vehicle invoice text:\n\n${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      const parsed = JSON.parse(responseText) as ParsedResult;
      
      // Validate response structure
      if (!parsed.data || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format from OpenAI');
      }

      return parsed;
    } catch (error) {
      console.error('AI parsing failed:', error);
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }

  static async parseWithFallback(text: string, fallbackFn: (text: string) => Partial<ExtractedInvoiceData>): Promise<ParsedResult> {
    try {
      if (this.isInitialized()) {
        return await this.parseInvoiceText(text);
      }
    } catch (error) {
      console.warn('AI parsing failed, falling back to regex:', error);
    }

    // Fallback to regex parsing
    const fallbackData = fallbackFn(text);
    return {
      data: fallbackData,
      confidence: 60, // Lower confidence for regex parsing
      fieldsWithLowConfidence: Object.keys(fallbackData).filter(key => 
        !fallbackData[key as keyof ExtractedInvoiceData] || 
        String(fallbackData[key as keyof ExtractedInvoiceData]).length < 2
      )
    };
  }
}