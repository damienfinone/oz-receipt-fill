export interface FraudIndicator {
  type: 'critical' | 'warning' | 'info' | 'metadata-tampering' | 'visual-inconsistency' | 'text-layer-mismatch';
  field: string;
  message: string;
  severity: number; // 1-10, higher is more severe
}

export interface FraudAnalysis {
  fraudScore: number; // 0-100, higher is more trustworthy
  fraudIndicators: FraudIndicator[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class FraudDetectionService {
  static analyzeInvoice(data: any, confidence?: number, documentAnalysis?: any): FraudAnalysis {
    const indicators: FraudIndicator[] = [];
    let baseScore = 100;

    // Mathematical validation
    const mathIssues = this.validateMath(data);
    indicators.push(...mathIssues);
    baseScore -= mathIssues.reduce((sum, issue) => sum + issue.severity * 2, 0);

    // Business logic validation  
    const businessIssues = this.validateBusinessLogic(data);
    indicators.push(...businessIssues);
    baseScore -= businessIssues.reduce((sum, issue) => sum + issue.severity * 1.5, 0);

    // OCR confidence analysis
    if (confidence !== undefined && confidence < 70) {
      indicators.push({
        type: 'warning',
        field: 'general',
        message: `Low OCR confidence (${confidence}%) - document quality may be poor or tampered`,
        severity: confidence < 50 ? 8 : 5
      });
      baseScore -= confidence < 50 ? 16 : 10;
    }

    // Format validation
    const formatIssues = this.validateFormats(data);
    indicators.push(...formatIssues);
    baseScore -= formatIssues.reduce((sum, issue) => sum + issue.severity, 0);

    // Document analysis integration (tampering detection)
    if (documentAnalysis?.suspiciousIndicators) {
      indicators.push(...documentAnalysis.suspiciousIndicators);
      baseScore -= documentAnalysis.suspiciousIndicators.reduce((sum: number, issue: any) => 
        sum + issue.severity * 1.2, 0);
    }

    // Clamp score between 0-100
    const fraudScore = Math.max(0, Math.min(100, baseScore));
    
    const riskLevel = fraudScore >= 80 ? 'low' : fraudScore >= 50 ? 'medium' : 'high';

    return {
      fraudScore,
      fraudIndicators: indicators,
      riskLevel
    };
  }

  private static validateMath(data: any): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    
    // Parse financial values
    const totalCost = this.parseAmount(data.totalCost);
    const deposit = this.parseAmount(data.deposit);
    const tradeInValue = this.parseAmount(data.tradeInValue);
    const balanceOwing = this.parseAmount(data.balanceOwing);
    const gst = this.parseAmount(data.gst);

    // Validate Balance Owing = Total Cost - Deposit - Trade In Value
    if (totalCost && (deposit || tradeInValue || balanceOwing)) {
      const expectedBalance = totalCost - (deposit || 0) - (tradeInValue || 0);
      if (balanceOwing && Math.abs(balanceOwing - expectedBalance) > 1) {
        indicators.push({
          type: 'critical',
          field: 'balanceOwing',
          message: `Balance calculation error: Expected ${expectedBalance.toFixed(2)}, found ${balanceOwing.toFixed(2)}`,
          severity: 10
        });
      }
    }

    // GST should be approximately 10% (between 9-11% accounting for rounding)
    if (gst && totalCost) {
      const gstPercentage = (gst / totalCost) * 100;
      if (gstPercentage < 8 || gstPercentage > 12) {
        indicators.push({
          type: 'warning',
          field: 'gst',
          message: `Unusual GST rate: ${gstPercentage.toFixed(1)}% (expected ~10%)`,
          severity: 6
        });
      }
    }

    // Check for unrealistic amounts
    if (totalCost && (totalCost < 1000 || totalCost > 500000)) {
      indicators.push({
        type: 'warning',
        field: 'totalCost',
        message: 'Vehicle price outside typical range',
        severity: 4
      });
    }

    return indicators;
  }

  private static validateBusinessLogic(data: any): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    // VIN validation (should be 17 characters)
    if (data.vin && data.vin.length !== 17) {
      indicators.push({
        type: 'critical',
        field: 'vin',
        message: 'Invalid VIN length (should be 17 characters)',
        severity: 9
      });
    }

    // ABN validation (should be 11 digits)
    if (data.abn && !/^\d{11}$/.test(data.abn.replace(/\s/g, ''))) {
      indicators.push({
        type: 'warning',
        field: 'abn',
        message: 'ABN format appears invalid',
        severity: 5
      });
    }

    // Date validation
    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
    const today = new Date();
    
    if (invoiceDate && invoiceDate > today) {
      indicators.push({
        type: 'critical',
        field: 'invoiceDate',
        message: 'Invoice date is in the future',
        severity: 8
      });
    }

    if (invoiceDate && invoiceDate < new Date(2010, 0, 1)) {
      indicators.push({
        type: 'warning',
        field: 'invoiceDate',
        message: 'Very old invoice date',
        severity: 3
      });
    }

    // Vehicle year validation
    const currentYear = new Date().getFullYear();
    const vehicleYear = parseInt(data.vehicleYear);
    
    if (vehicleYear && (vehicleYear < 1990 || vehicleYear > currentYear + 1)) {
      indicators.push({
        type: 'warning',
        field: 'vehicleYear',
        message: 'Vehicle year outside expected range',
        severity: 4
      });
    }

    // Odometer validation
    const odometer = this.parseAmount(data.odometer);
    if (odometer && vehicleYear) {
      const vehicleAge = currentYear - vehicleYear;
      const expectedMaxKm = vehicleAge * 25000; // Rough estimate
      
      if (odometer > expectedMaxKm * 2) {
        indicators.push({
          type: 'warning',
          field: 'odometer',
          message: 'Unusually high odometer reading for vehicle age',
          severity: 5
        });
      }
      
      if (odometer < 100 && vehicleAge > 1) {
        indicators.push({
          type: 'warning',
          field: 'odometer',
          message: 'Suspiciously low odometer reading',
          severity: 6
        });
      }
    }

    return indicators;
  }

  private static validateFormats(data: any): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    // Phone number format
    if (data.phone && !/^[\d\s\+\(\)\-]{8,}$/.test(data.phone)) {
      indicators.push({
        type: 'info',
        field: 'phone',
        message: 'Phone number format may be unusual',
        severity: 2
      });
    }

    // Email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      indicators.push({
        type: 'warning',
        field: 'email',
        message: 'Email format appears invalid',
        severity: 3
      });
    }

    // Postcode format (Australian)
    if (data.postcode && !/^\d{4}$/.test(data.postcode)) {
      indicators.push({
        type: 'info',
        field: 'postcode',
        message: 'Postcode format may be invalid (should be 4 digits)',
        severity: 2
      });
    }

    return indicators;
  }

  private static parseAmount(value: string | number): number | null {
    if (typeof value === 'number') return value;
    if (!value) return null;
    
    const cleanValue = value.toString().replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? null : parsed;
  }

  static getFieldRiskLevel(fieldName: string, indicators: FraudIndicator[]): 'low' | 'medium' | 'high' {
    const fieldIndicators = indicators.filter(i => i.field === fieldName);
    if (fieldIndicators.length === 0) return 'low';
    
    const maxSeverity = Math.max(...fieldIndicators.map(i => i.severity));
    if (maxSeverity >= 8) return 'high';
    if (maxSeverity >= 5) return 'medium';
    return 'low';
  }
}