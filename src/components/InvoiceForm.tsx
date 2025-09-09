import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Building, Receipt, Calendar, DollarSign, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { FraudDetectionService } from '@/services/fraudDetectionService';

interface InvoiceData {
  // Financial
  totalCost: string;
  deposit: string;
  tradeInValue: string;
  balanceOwing: string;
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
  odometer: string;
  
  // Identification
  vin: string;
  nvic: string;
  registration: string;
  state: string;
  
  // Fraud Detection
  fraudScore?: number;
  fraudIndicators?: Array<{
    type: 'critical' | 'warning' | 'info' | 'metadata-tampering' | 'visual-inconsistency' | 'text-layer-mismatch';
    field: string;
    message: string;
    severity: number;
  }>;
  riskLevel?: 'low' | 'medium' | 'high';
  
  // Vendor & Invoice
  vendorName: string;
  vendorAbn: string;
  purchaseDate: string;
  invoiceNumber: string;
  
  // Customer Details
  deliverTo: string;
  
  // Bank Details
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
  paymentReference: string;
}

interface InvoiceFormProps {
  data: InvoiceData;
  onDataUpdate: (data: Partial<InvoiceData>) => void;
  confidence?: number;
  fieldsWithLowConfidence?: string[];
}

export const InvoiceForm = ({ data, onDataUpdate, confidence, fieldsWithLowConfidence = [] }: InvoiceFormProps) => {
  const handleInputChange = (field: keyof InvoiceData, value: string) => {
    onDataUpdate({ [field]: value });
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, '');
    if (numericValue) {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
      }).format(parseFloat(numericValue));
    }
    return value;
  };

  // FRAUD DETECTION DISABLED FOR PERFORMANCE
  /*
  const getFieldRiskBorder = (fieldName: string) => {
    if (!data.fraudIndicators) return '';
    const riskLevel = FraudDetectionService.getFieldRiskLevel(fieldName, data.fraudIndicators);
    switch (riskLevel) {
      case 'high': return 'border-destructive border-2';
      case 'medium': return 'border-warning border-2';
      case 'low': return '';
      default: return '';
    }
  };

  const getFieldTooltip = (fieldName: string) => {
    if (!data.fraudIndicators) return null;
    const fieldIndicators = data.fraudIndicators.filter(i => i.field === fieldName);
    if (fieldIndicators.length === 0) return null;
    return fieldIndicators.map(i => i.message).join('; ');
  };
  */

  return (
    <div className="space-y-6">
      {/* Financial Information */}
      <Card className="p-4 border-success/20 bg-success/5">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-success" />
          <h3 className="font-semibold text-success">Financial Details</h3>
          {confidence && confidence > 0 && (
            <ConfidenceIndicator confidence={confidence} />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalCost">Total Cost (AUD)</Label>
            <Input
              id="totalCost"
              value={data.totalCost}
              onChange={(e) => handleInputChange('totalCost', e.target.value)}
              placeholder="56,180.66"
              className={cn(
                fieldsWithLowConfidence?.includes('totalCost') && "border-destructive"
              )}
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('totalCost', formatted);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deposit">Deposit (AUD)</Label>
            <Input
              id="deposit"
              value={data.deposit}
              onChange={(e) => handleInputChange('deposit', e.target.value)}
              placeholder="5,000.00"
              className={cn(
                fieldsWithLowConfidence?.includes('deposit') && "border-destructive"
              )}
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('deposit', formatted);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tradeInValue">Trade in Value (AUD)</Label>
            <Input
              id="tradeInValue"
              value={data.tradeInValue}
              onChange={(e) => handleInputChange('tradeInValue', e.target.value)}
              placeholder="15,000.00"
              className={cn(
                fieldsWithLowConfidence?.includes('tradeInValue') && "border-destructive"
              )}
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('tradeInValue', formatted);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="balanceOwing">Balance Owing/Payable (AUD)</Label>
            <Input
              id="balanceOwing"
              value={data.balanceOwing}
              onChange={(e) => handleInputChange('balanceOwing', e.target.value)}
              placeholder="36,180.66"
              className={cn(
                fieldsWithLowConfidence?.includes('balanceOwing') && "border-destructive"
              )}
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('balanceOwing', formatted);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price (AUD)</Label>
            <Input
              id="purchasePrice"
              value={data.purchasePrice}
              onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
              placeholder="51,236.53"
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('purchasePrice', formatted);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstAmount">GST Amount (AUD)</Label>
            <Input
              id="gstAmount"
              value={data.gstAmount}
              onChange={(e) => handleInputChange('gstAmount', e.target.value)}
              placeholder="4,944.13"
              className={cn(
                fieldsWithLowConfidence?.includes('gstAmount') && "border-destructive"
              )}
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('gstAmount', formatted);
              }}
            />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Vehicle Information */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Car className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-primary">Vehicle Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assetType">Asset Type</Label>
            <Select value={data.assetType} onValueChange={(value) => handleInputChange('assetType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="motor-vehicle">Motor Vehicle</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="commercial-vehicle">Commercial Vehicle</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyType">Body Type</Label>
            <Select value={data.bodyType} onValueChange={(value) => handleInputChange('bodyType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select body type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="hatchback">Hatchback</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="wagon">Wagon</SelectItem>
                <SelectItem value="coupe">Coupe</SelectItem>
                <SelectItem value="convertible">Convertible</SelectItem>
                <SelectItem value="ute">Ute</SelectItem>
                <SelectItem value="van">Van</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vehicleMake">Make</Label>
              {fieldsWithLowConfidence.includes('vehicleMake') && (
                <ConfidenceIndicator confidence={0} fieldName="vehicleMake" isLowConfidence={true} />
              )}
            </div>
            <Input
              id="vehicleMake"
              value={data.vehicleMake}
              onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
              placeholder="e.g., BYD"
              className={fieldsWithLowConfidence.includes('vehicleMake') ? 'border-destructive' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleModel">Model</Label>
            <Input
              id="vehicleModel"
              value={data.vehicleModel}
              onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
              placeholder="e.g., SEAL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleYear">Year</Label>
            <Select value={data.vehicleYear} onValueChange={(value) => handleInputChange('vehicleYear', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 26 }, (_, i) => {
                  const year = (2025 - i).toString();
                  return <SelectItem key={year} value={year}>{year}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transmission">Transmission</Label>
            <Select value={data.transmission} onValueChange={(value) => handleInputChange('transmission', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cvt">CVT</SelectItem>
                <SelectItem value="dual-clutch">Dual Clutch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select value={data.fuelType} onValueChange={(value) => handleInputChange('fuelType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="plug-in-hybrid">Plug-in Hybrid</SelectItem>
                <SelectItem value="lpg">LPG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={data.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              placeholder="e.g., Atlantis Grey"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engineNumber">Engine Number</Label>
            <Input
              id="engineNumber"
              value={data.engineNumber}
              onChange={(e) => handleInputChange('engineNumber', e.target.value)}
              placeholder="Engine number"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="odometer">Odometer (km)</Label>
            <Input
              id="odometer"
              value={data.odometer}
              onChange={(e) => handleInputChange('odometer', e.target.value)}
              placeholder="e.g., 45,000"
              className={cn(
                fieldsWithLowConfidence?.includes('odometer') && "border-destructive"
              )}
            />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Vehicle Identification */}
      <Card className="p-4 border-muted/50 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-muted-foreground">Vehicle Identification</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vin">Vehicle Identification Number (VIN)</Label>
            <Input
              id="vin"
              value={data.vin}
              onChange={(e) => handleInputChange('vin', e.target.value)}
              placeholder="17-character VIN"
              className={cn(
                "font-mono text-sm",
                fieldsWithLowConfidence?.includes('vin') && "border-destructive"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nvic">National Vehicle Identification Code (NVIC)</Label>
            <Input
              id="nvic"
              value={data.nvic}
              onChange={(e) => handleInputChange('nvic', e.target.value)}
              placeholder="NVIC code"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration">Registration</Label>
            <Input
              id="registration"
              value={data.registration}
              onChange={(e) => handleInputChange('registration', e.target.value)}
              placeholder="Registration number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select value={data.state} onValueChange={(value) => handleInputChange('state', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NSW">NSW</SelectItem>
                <SelectItem value="VIC">VIC</SelectItem>
                <SelectItem value="QLD">QLD</SelectItem>
                <SelectItem value="WA">WA</SelectItem>
                <SelectItem value="SA">SA</SelectItem>
                <SelectItem value="TAS">TAS</SelectItem>
                <SelectItem value="NT">NT</SelectItem>
                <SelectItem value="ACT">ACT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Vendor Information */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-center gap-2 mb-3">
          <Building className="h-4 w-4 text-secondary" />
          <h3 className="font-semibold text-secondary">Vendor Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vendorName">Vendor Name</Label>
            <Input
              id="vendorName"
              value={data.vendorName}
              onChange={(e) => handleInputChange('vendorName', e.target.value)}
              placeholder="ABC Motors Pty Ltd"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendorAbn">ABN</Label>
            <Input
              id="vendorAbn"
              value={data.vendorAbn}
              onChange={(e) => handleInputChange('vendorAbn', e.target.value)}
              placeholder="12 345 678 901"
              className={cn(
                fieldsWithLowConfidence?.includes('vendorAbn') && "border-destructive"
              )}
            />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Invoice Details */}
      <Card className="p-4 border-accent/20 bg-accent/5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-accent-foreground" />
          <h3 className="font-semibold text-accent-foreground">Invoice Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={data.invoiceNumber}
              onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
              placeholder="INV-2024-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={data.purchaseDate}
              onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
              className={cn(
                fieldsWithLowConfidence?.includes('purchaseDate') && "border-destructive"
              )}
            />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Customer Details */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Building className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-primary">Customer Details</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliverTo">Deliver To</Label>
          <Input
            id="deliverTo"
            value={data.deliverTo}
            onChange={(e) => handleInputChange('deliverTo', e.target.value)}
            placeholder="Customer name or delivery address"
          />
          {fieldsWithLowConfidence.includes('deliverTo') && (
            <ConfidenceIndicator 
              fieldName="deliverTo" 
              confidence={confidence}
              isLowConfidence={fieldsWithLowConfidence.includes('deliverTo')}
            />
          )}
        </div>
      </Card>

      <Separator />

      {/* Bank Details */}
      <Card className="p-4 border-muted/50 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-muted-foreground">Bank Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={data.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              placeholder="e.g., Commonwealth Bank"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={data.accountName}
              onChange={(e) => handleInputChange('accountName', e.target.value)}
              placeholder="Account holder name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bsb">BSB</Label>
            <Input
              id="bsb"
              value={data.bsb}
              onChange={(e) => handleInputChange('bsb', e.target.value)}
              placeholder="123-456"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={data.accountNumber}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              placeholder="Account number"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="paymentReference">Payment Reference</Label>
            <Input
              id="paymentReference"
              value={data.paymentReference}
              onChange={(e) => handleInputChange('paymentReference', e.target.value)}
              placeholder="Payment reference or description"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};