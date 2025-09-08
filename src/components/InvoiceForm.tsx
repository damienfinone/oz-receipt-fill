import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { Car, Building, Receipt, Calendar } from "lucide-react";

interface InvoiceData {
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

  return (
    <div className="space-y-6">
      {/* Vehicle Information */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Car className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-primary">Vehicle Information</h3>
          {confidence && confidence > 0 && (
            <ConfidenceIndicator confidence={confidence} />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              placeholder="e.g., Toyota"
              className={fieldsWithLowConfidence.includes('vehicleMake') ? 'border-destructive' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleModel">Model</Label>
            <Input
              id="vehicleModel"
              value={data.vehicleModel}
              onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
              placeholder="e.g., Camry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleYear">Year</Label>
            <Input
              id="vehicleYear"
              value={data.vehicleYear}
              onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
              placeholder="e.g., 2023"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">VIN Number</Label>
            <Input
              id="vin"
              value={data.vin}
              onChange={(e) => handleInputChange('vin', e.target.value)}
              placeholder="17-character VIN"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Financial Information */}
      <Card className="p-4 border-success/20 bg-success/5">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-success" />
          <h3 className="font-semibold text-success">Financial Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price (AUD)</Label>
            <Input
              id="purchasePrice"
              value={data.purchasePrice}
              onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
              placeholder="35,000.00"
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
              placeholder="3,500.00"
              onBlur={(e) => {
                const formatted = formatCurrency(e.target.value);
                handleInputChange('gstAmount', formatted);
              }}
            />
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
            />
          </div>
        </div>
      </Card>
    </div>
  );
};