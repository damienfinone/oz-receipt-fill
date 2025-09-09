import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentPreview } from "@/components/DocumentPreview";
import { InvoiceForm } from "@/components/InvoiceForm";
import { FraudScoreIndicator } from "@/components/FraudScoreIndicator";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { JobTracker } from "@/components/JobTracker";
import { DocumentProcessor } from "@/services/documentProcessor";
import { FraudDetectionService, FraudAnalysis, FraudIndicator } from "@/services/fraudDetectionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, Zap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  
  // Fraud Analysis
  fraudScore: number;
  fraudIndicators: FraudIndicator[];
  riskLevel: 'low' | 'medium' | 'high';
  
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
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMode, setProcessingMode] = useState<'sync' | 'async' | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [fieldsWithLowConfidence, setFieldsWithLowConfidence] = useState<string[]>([]);
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingMode(null);
    setJobId(null);
    setInvoiceData(null);
    setConfidence(0);
    setFieldsWithLowConfidence([]);
    setFraudAnalysis(null);
    setProcessingTime(null);

    try {
      console.log('Starting document processing with new flow...');
      
      const result = await DocumentProcessor.processDocument(uploadedFile, (progress) => {
        setProcessingProgress(progress);
      });

      console.log('Processing result:', result);
      setProcessingMode(result.mode);

      if (result.mode === 'sync' && result.status === 'completed') {
        // Handle synchronous completion
        handleProcessingComplete(result.result, result.confidence);
        setProcessingTime(result.elapsedMs || 0);
        toast({
          title: "Processing completed",
          description: `Invoice processed in ${Math.round((result.elapsedMs || 0) / 1000 * 100) / 100}s with ${result.confidence}% confidence`,
        });
      } else if (result.mode === 'async') {
        // Handle asynchronous processing
        setJobId(result.jobId);
        toast({
          title: "Processing started",
          description: "Your document is being processed. You'll be notified when it's ready.",
        });
      }

    } catch (error) {
      console.error('Processing failed:', error);
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing the document.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleProcessingComplete = (data: any, confidenceScore: number) => {
    // FRAUD DETECTION DISABLED FOR PERFORMANCE - Run fraud detection analysis
    // const fraudResult = FraudDetectionService.analyzeInvoice(data, confidenceScore);
    const fraudResult = { fraudScore: 0, fraudIndicators: [], riskLevel: 'low' as const };

    setInvoiceData({
      // Financial
      totalCost: data.totalCost || '',
      deposit: data.deposit || '',
      tradeInValue: data.tradeInValue || '',
      balanceOwing: data.balanceOwing || '',
      purchasePrice: data.purchasePrice || '',
      gstAmount: data.gstAmount || '',
      
      // Vehicle Details
      assetType: data.assetType || '',
      bodyType: data.bodyType || '',
      vehicleMake: data.vehicleMake || '',
      vehicleModel: data.vehicleModel || '',
      vehicleYear: data.vehicleYear || '',
      transmission: data.transmission || '',
      fuelType: data.fuelType || '',
      color: data.color || '',
      engineNumber: data.engineNumber || '',
      odometer: data.odometer || '',
      
      // Identification
      vin: data.vin || '',
      nvic: data.nvic || '',
      registration: data.registration || '',
      state: data.state || '',
      
      // Fraud Analysis
      fraudScore: fraudResult.fraudScore,
      fraudIndicators: fraudResult.fraudIndicators,
      riskLevel: fraudResult.riskLevel,
      
      // Vendor & Invoice
      vendorName: data.vendorName || '',
      vendorAbn: data.vendorAbn || '',
      purchaseDate: data.purchaseDate || '',
      invoiceNumber: data.invoiceNumber || '',
      
      // Customer Details
      deliverTo: data.deliverTo || '',
      
      // Bank Details
      bankName: data.bankName || '',
      accountName: data.accountName || '',
      bsb: data.bsb || '',
      accountNumber: data.accountNumber || '',
      paymentReference: data.paymentReference || ''
    });
    
    setConfidence(confidenceScore);
    setFieldsWithLowConfidence(data.fieldsWithLowConfidence || []);
    setFraudAnalysis(fraudResult);
    setIsProcessing(false);
    setProcessingProgress(0);
  };

  const handleDataUpdate = (updatedData: Partial<InvoiceData>) => {
    const newData = { ...invoiceData, ...updatedData };
    
    // FRAUD DETECTION DISABLED FOR PERFORMANCE - Re-run fraud detection when data changes
    // const fraudResult = FraudDetectionService.analyzeInvoice(newData, confidence);
    const fraudResult = { fraudScore: 0, fraudIndicators: [], riskLevel: 'low' as const };
    
    setInvoiceData({
      ...newData,
      fraudScore: fraudResult.fraudScore,
      fraudIndicators: fraudResult.fraudIndicators,
      riskLevel: fraudResult.riskLevel
    } as InvoiceData);
    
    setFraudAnalysis(fraudResult);
  };

  const handleExport = () => {
    if (!invoiceData) return;
    
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Toaster />
      
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Australian Vehicle Invoice Processor
              </h1>
              <p className="text-muted-foreground mt-1">
                Fast PDF processing with AI-powered extraction
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <DocumentUpload onFileUpload={handleFileUpload} />
            
            {file && (
              <DocumentPreview 
                file={file} 
              />
            )}
          </div>

          <div className="space-y-6">
            {isProcessing && processingMode === 'sync' && (
              <ProcessingStatus 
                progress={processingProgress}
                fileName={file?.name || ""}
              />
            )}

            {processingMode === 'async' && jobId && (
              <JobTracker 
                jobId={jobId}
                onComplete={(result) => handleProcessingComplete(result, 85)}
                onError={(error) => {
                  setIsProcessing(false);
                  toast({
                    title: "Processing failed",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            )}

            {invoiceData && (
              <div className="space-y-6">
                {/* FRAUD DETECTION DISABLED FOR PERFORMANCE
                <FraudScoreIndicator 
                  fraudScore={invoiceData.fraudScore}
                  riskLevel={invoiceData.riskLevel}
                  fraudIndicators={invoiceData.fraudIndicators}
                />
                */}
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Extracted Data
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <ConfidenceIndicator 
                        confidence={confidence}
                        processingTime={processingTime || undefined}
                      />
                      {processingMode === 'sync' && (
                        <div className="flex items-center text-xs text-success">
                          <Zap className="mr-1 h-3 w-3" />
                          Fast Processing
                        </div>
                      )}
                      {processingMode === 'async' && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Background Processing
                        </div>
                      )}
                      <Button onClick={handleExport} size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export JSON
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <InvoiceForm 
                      data={invoiceData}
                      onDataUpdate={handleDataUpdate}
                      fieldsWithLowConfidence={fieldsWithLowConfidence}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;