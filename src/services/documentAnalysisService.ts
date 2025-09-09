import * as pdfjsLib from 'pdfjs-dist';

interface DocumentMetadata {
  creationDate?: Date;
  modificationDate?: Date;
  creator?: string;
  producer?: string;
  title?: string;
  subject?: string;
  author?: string;
  keywords?: string;
}

interface FontAnalysis {
  fontName: string;
  fontSize: number;
  count: number;
  positions: { x: number; y: number; width: number; height: number }[];
}

interface DocumentAnalysisResult {
  metadata: DocumentMetadata;
  hasTextLayer: boolean;
  textLayerText?: string;
  fontAnalysis: FontAnalysis[];
  suspiciousIndicators: {
    type: 'metadata-tampering' | 'visual-inconsistency' | 'text-layer-mismatch';
    field: string;
    message: string;
    severity: number;
  }[];
}

export class DocumentAnalysisService {
  private static readonly SUSPICIOUS_SOFTWARE = [
    'pdf editor', 'ilovepdf', 'smallpdf', 'sejda', 'pdftk', 'foxit phantom',
    'adobe acrobat dc', 'nitro pro', 'pdfcreator', 'cutepdf', 'bullzip',
    'pdf24', 'pdf architect', 'wondershare', 'pdfelement', 'docusign',
    'hellosign', 'pandadoc', 'adobe sign'
  ];

  static async analyzeDocument(file: File): Promise<DocumentAnalysisResult> {
    const result: DocumentAnalysisResult = {
      metadata: {},
      hasTextLayer: false,
      fontAnalysis: [],
      suspiciousIndicators: []
    };

    try {
      if (this.isPdfFile(file)) {
        await this.analyzePdfDocument(file, result);
      } else {
        // For images, we can only do basic metadata extraction
        await this.analyzeImageDocument(file, result);
      }
    } catch (error) {
      console.error('Document analysis failed:', error);
      result.suspiciousIndicators.push({
        type: 'metadata-tampering',
        field: 'general',
        message: 'Could not analyze document metadata - file may be corrupted or protected',
        severity: 4
      });
    }

    return result;
  }

  private static isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  private static async analyzePdfDocument(file: File, result: DocumentAnalysisResult): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Extract PDF metadata
    const metadata = await pdf.getMetadata();
    result.metadata = this.processPdfMetadata(metadata);

    // Analyze metadata for suspicious patterns
    this.analyzeMetadataForTampering(result.metadata, result);

    // Get first page for text layer analysis
    const page = await pdf.getPage(1);
    
    // Extract text content and analyze fonts
    const textContent = await page.getTextContent();
    if (textContent.items.length > 0) {
      result.hasTextLayer = true;
      result.textLayerText = textContent.items
        .filter((item): item is any => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');

      // Analyze font consistency
      result.fontAnalysis = this.analyzeFonts(textContent);
      this.analyzeFontConsistency(result.fontAnalysis, result);
    }

    // Check for layers (if document has multiple layers, it might be edited)
    const pageDict = await page.getAnnotations();
    if (pageDict.length > 0) {
      result.suspiciousIndicators.push({
        type: 'visual-inconsistency',
        field: 'document-structure',
        message: `Document contains ${pageDict.length} annotation(s) - may indicate editing`,
        severity: 3
      });
    }

    await pdf.destroy();
  }

  private static async analyzeImageDocument(file: File, result: DocumentAnalysisResult): Promise<void> {
    // For images, we can check basic file metadata
    result.metadata = {
      creationDate: new Date(file.lastModified),
      modificationDate: new Date(file.lastModified)
    };

    // Check if modification and creation dates are suspicious
    const now = new Date();
    const fileAge = now.getTime() - file.lastModified;
    
    // If file was modified very recently but is supposedly an old document, flag it
    if (fileAge < 60000) { // Modified within last minute
      result.suspiciousIndicators.push({
        type: 'metadata-tampering',
        field: 'file-timestamp',
        message: 'File was modified very recently - may indicate recent editing',
        severity: 5
      });
    }
  }

  private static processPdfMetadata(pdfMetadata: any): DocumentMetadata {
    const info = pdfMetadata.info || {};
    
    return {
      creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
      modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      title: info.Title || undefined,
      subject: info.Subject || undefined,
      author: info.Author || undefined,
      keywords: info.Keywords || undefined
    };
  }

  private static analyzeMetadataForTampering(metadata: DocumentMetadata, result: DocumentAnalysisResult): void {
    // Check creation vs modification dates
    if (metadata.creationDate && metadata.modificationDate) {
      const timeDiff = metadata.modificationDate.getTime() - metadata.creationDate.getTime();
      
      if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours apart
        result.suspiciousIndicators.push({
          type: 'metadata-tampering',
          field: 'modification-date',
          message: `Document was modified ${Math.round(timeDiff / (24 * 60 * 60 * 1000))} days after creation`,
          severity: 6
        });
      }

      // Check if modification date is in the future
      if (metadata.modificationDate > new Date()) {
        result.suspiciousIndicators.push({
          type: 'metadata-tampering',
          field: 'modification-date',
          message: 'Document modification date is in the future',
          severity: 8
        });
      }
    }

    // Check for suspicious software signatures
    const softwareFields = [metadata.creator, metadata.producer].filter(Boolean);
    for (const software of softwareFields) {
      const suspiciousMatch = this.SUSPICIOUS_SOFTWARE.find(suspicious => 
        software!.toLowerCase().includes(suspicious)
      );
      
      if (suspiciousMatch) {
        const severity = suspiciousMatch.includes('editor') || suspiciousMatch.includes('sign') ? 7 : 5;
        result.suspiciousIndicators.push({
          type: 'metadata-tampering',
          field: 'software-signature',
          message: `Document created/modified with ${software} - commonly used for editing PDFs`,
          severity
        });
      }
    }

    // Check for missing or suspicious metadata
    if (!metadata.creationDate && !metadata.modificationDate) {
      result.suspiciousIndicators.push({
        type: 'metadata-tampering',
        field: 'missing-metadata',
        message: 'Document has no creation or modification timestamps',
        severity: 4
      });
    }

    // Check for generic or suspicious titles/authors
    const suspiciousPatterns = ['untitled', 'document', 'invoice', 'receipt', 'temp', 'test'];
    if (metadata.title && suspiciousPatterns.some(pattern => 
      metadata.title!.toLowerCase().includes(pattern))) {
      result.suspiciousIndicators.push({
        type: 'metadata-tampering',
        field: 'document-title',
        message: `Generic document title: "${metadata.title}"`,
        severity: 3
      });
    }
  }

  private static analyzeFonts(textContent: any): FontAnalysis[] {
    const fontMap = new Map<string, FontAnalysis>();

    for (const item of textContent.items) {
      if (!item.fontName) continue;

      const key = `${item.fontName}-${Math.round(item.height)}`;
      
      if (!fontMap.has(key)) {
        fontMap.set(key, {
          fontName: item.fontName,
          fontSize: Math.round(item.height),
          count: 0,
          positions: []
        });
      }

      const analysis = fontMap.get(key)!;
      analysis.count++;
      analysis.positions.push({
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
      });
    }

    return Array.from(fontMap.values());
  }

  private static analyzeFontConsistency(fontAnalysis: FontAnalysis[], result: DocumentAnalysisResult): void {
    // Check for too many different fonts (might indicate editing)
    const uniqueFonts = new Set(fontAnalysis.map(f => f.fontName));
    if (uniqueFonts.size > 5) {
      result.suspiciousIndicators.push({
        type: 'visual-inconsistency',
        field: 'font-variety',
        message: `Document uses ${uniqueFonts.size} different fonts - may indicate editing`,
        severity: 5
      });
    }

    // Check for unusual font combinations
    const commonFonts = ['times', 'arial', 'helvetica', 'calibri', 'georgia'];
    const uncommonFonts = Array.from(uniqueFonts).filter(font => 
      !commonFonts.some(common => font.toLowerCase().includes(common))
    );

    if (uncommonFonts.length > 0) {
      result.suspiciousIndicators.push({
        type: 'visual-inconsistency',
        field: 'font-type',
        message: `Unusual fonts detected: ${uncommonFonts.slice(0, 3).join(', ')}`,
        severity: 4
      });
    }

    // Check for inconsistent spacing/positioning patterns
    for (const font of fontAnalysis) {
      if (font.positions.length > 10) {
        const yPositions = font.positions.map(p => p.y);
        const yVariance = this.calculateVariance(yPositions);
        
        // If text of same font has very inconsistent Y positions, might be edited
        if (yVariance > 100) {
          result.suspiciousIndicators.push({
            type: 'visual-inconsistency',
            field: 'text-alignment',
            message: `Inconsistent text alignment detected for ${font.fontName}`,
            severity: 4
          });
        }
      }
    }
  }

  private static calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  static compareOcrWithTextLayer(ocrText: string, textLayerText?: string): {
    similarity: number;
    indicators: Array<{
      type: 'text-layer-mismatch';
      field: string;
      message: string;
      severity: number;
    }>;
  } {
    const indicators: any[] = [];

    if (!textLayerText) {
      return { similarity: 100, indicators }; // No text layer to compare
    }

    // Normalize texts for comparison
    const normalizeText = (text: string) => 
      text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

    const normalizedOcr = normalizeText(ocrText);
    const normalizedTextLayer = normalizeText(textLayerText);

    // Calculate similarity using Levenshtein-like approach
    const similarity = this.calculateTextSimilarity(normalizedOcr, normalizedTextLayer);

    if (similarity < 70) {
      indicators.push({
        type: 'text-layer-mismatch' as const,
        field: 'text-consistency',
        message: `OCR text differs significantly from embedded text (${similarity}% similarity)`,
        severity: similarity < 50 ? 8 : 6
      });
    }

    // Check for specific suspicious patterns
    const ocrNumbers = normalizedOcr.match(/\d+/g) || [];
    const textLayerNumbers = normalizedTextLayer.match(/\d+/g) || [];

    if (ocrNumbers.length !== textLayerNumbers.length) {
      indicators.push({
        type: 'text-layer-mismatch' as const,
        field: 'numerical-data',
        message: 'Different number of numerical values between OCR and text layer',
        severity: 7
      });
    }

    return { similarity, indicators };
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 100;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - editDistance) / longer.length) * 100);
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}