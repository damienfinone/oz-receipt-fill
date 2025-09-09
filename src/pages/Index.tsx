import { useState, useEffect } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { InvoiceForm } from "@/components/InvoiceForm";
import { DocumentPreview } from "@/components/DocumentPreview";
import { FraudScoreIndicator } from "@/components/FraudScoreIndicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { OCRService } from "@/services/ocrService";
import { FraudDetectionService } from "@/services/fraudDetectionService";
import { FileText, Car, DollarSign, Loader2, Download } from "lucide-react";

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

const Index = () => {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    totalCost: "",
    deposit: "",
    tradeInValue: "",
    balanceOwing: "",
    purchasePrice: "",
    gstAmount: "",
    assetType: "",
    bodyType: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    transmission: "",
    fuelType: "",
    color: "",
    engineNumber: "",
    odometer: "",
    vin: "",
    nvic: "",
    registration: "",
    state: "",
    vendorName: "",
    vendorAbn: "",
    purchaseDate: "",
    invoiceNumber: "",
    deliverTo: "",
    bankName: "",
    accountName: "",
    bsb: "",
    accountNumber: "",
    paymentReference: "",
  });
  
  const [confidence, setConfidence] = useState(0);
  const [fieldsWithLowConfidence, setFieldsWithLowConfidence] = useState<string[]>([]);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      OCRService.terminate();
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    const uploadStartTime = Date.now();
    setStartTime(uploadStartTime);
    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingTime(null);
    
    try {
      const result = await OCRService.processInvoice(
        file, 
        (progress) => setProcessingProgress(progress)
      );
      
      // Calculate processing time for text extraction only (exclude fraud analysis)
      if (uploadStartTime) {
        const endTime = Date.now();
        const timeTaken = (endTime - uploadStartTime) / 1000; // Convert to seconds
        setProcessingTime(timeTaken);
      }
      
      // Run fraud detection analysis (including document analysis if available)
      const fraudAnalysis = FraudDetectionService.analyzeInvoice(
        result.data, 
        result.confidence, 
        result.documentAnalysis
      );
      
      // Update form with extracted data and fraud analysis
      const dataWithFraud = {
        ...result.data,
        fraudScore: fraudAnalysis.fraudScore,
        fraudIndicators: fraudAnalysis.fraudIndicators,
        riskLevel: fraudAnalysis.riskLevel
      };
      
      setInvoiceData(prev => ({ ...prev, ...dataWithFraud }));
      setConfidence(result.confidence);
      setFieldsWithLowConfidence(result.fieldsWithLowConfidence);
      
      const accuracyText = result.confidence > 60 ? 
        `AI-enhanced processing complete (${result.confidence}% confidence)` :
        `Local processing complete (${result.confidence}% confidence)`;
      
      toast({
        title: "Document processed successfully",
        description: accuracyText,
      });
      
      // Show fraud analysis results
      if (fraudAnalysis.riskLevel === 'high') {
        toast({
          title: "High fraud risk detected",
          description: `Fraud score: ${fraudAnalysis.fraudScore}/100. Please review carefully.`,
          variant: "destructive",
        });
      } else if (fraudAnalysis.riskLevel === 'medium') {
        toast({
          title: "Medium fraud risk detected",
          description: `Fraud score: ${fraudAnalysis.fraudScore}/100. Some issues found.`,
          variant: "default",
        });
      }
      
      if (result.fieldsWithLowConfidence.length > 0) {
        toast({
          title: "Some fields need verification",
          description: `Please review: ${result.fieldsWithLowConfidence.join(', ')}`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: "Could not extract data from the document. Please fill the form manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleDataUpdate = (updatedData: Partial<InvoiceData>) => {
    const newData = { ...invoiceData, ...updatedData };
    
    // Re-run fraud detection when data changes (without re-running document analysis)
    const fraudAnalysis = FraudDetectionService.analyzeInvoice(newData, confidence);
    
    setInvoiceData({
      ...newData,
      fraudScore: fraudAnalysis.fraudScore,
      fraudIndicators: fraudAnalysis.fraudIndicators,
      riskLevel: fraudAnalysis.riskLevel
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicle-invoice-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Australian Vehicle Invoice Processor
              </h1>
              <p className="text-muted-foreground">
                Extract tax invoice data from PDFs and images with fraud detection
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Preview */}
          <div className="space-y-6">
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Upload Invoice</h2>
              </div>
              <DocumentUpload onFileUpload={handleFileUpload} />
              
              {/* Processing Status underneath upload */}
              {isProcessing && (
                <div className="mt-6 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm font-medium">
                        Processing document with AI-enhanced extraction and fraud detection...
                      </p>
                    </div>
                    <Progress value={processingProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {processingProgress < 25 ? 'Initializing OCR engine...' :
                       processingProgress < 50 ? 'Extracting text from document...' :
                       processingProgress < 75 ? 'Parsing invoice data...' :
                       'Running fraud detection analysis...'}
                    </p>
                  </div>
                </div>
              )}
              
              {processingTime && !isProcessing && uploadedFile && Object.values(invoiceData).some(value => value !== "") && (
                <div className="mt-4 p-3 border border-success/20 bg-success/5 rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <p className="text-sm font-medium">
                      Document processed successfully in {processingTime.toFixed(1)} seconds! Review the extracted data and fraud analysis.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {uploadedFile && (
              <Card className="p-6 shadow-document">
                <h3 className="text-lg font-semibold mb-4">Document Preview</h3>
                <DocumentPreview file={uploadedFile} />
              </Card>
            )}
          </div>

          {/* Right Column - Form */}
          <div className="space-y-6">
            <Card className="p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-success" />
                  <h2 className="text-xl font-semibold">Invoice Details</h2>
                </div>
              </div>

              {invoiceData.fraudScore !== undefined && (
                <>
                  <FraudScoreIndicator
                    fraudScore={invoiceData.fraudScore}
                    riskLevel={invoiceData.riskLevel || 'medium'}
                    fraudIndicators={invoiceData.fraudIndicators || []}
                    className="mb-6"
                  />
                  <Separator className="my-6" />
                </>
              )}

              <InvoiceForm 
                data={invoiceData} 
                onDataUpdate={handleDataUpdate}
                confidence={confidence}
                fieldsWithLowConfidence={fieldsWithLowConfidence}
              />
              
              <Separator className="my-6" />
              
              <Button onClick={handleExport} className="w-full mb-4" disabled={!uploadedFile}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </Card>

            {uploadedFile && !isProcessing && Object.values(invoiceData).some(value => value !== "") && !processingTime && (
              <Card className="p-4 border-success/20 bg-success/5">
                <div className="flex items-center gap-2 text-success">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <p className="text-sm font-medium">
                    Document processed successfully! Review the extracted data and fraud analysis.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;