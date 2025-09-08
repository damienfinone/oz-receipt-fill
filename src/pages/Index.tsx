import { useState, useEffect } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { InvoiceForm } from "@/components/InvoiceForm";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { OCRService } from "@/services/ocrService";
import { FileText, Car, DollarSign, Loader2 } from "lucide-react";

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

const Index = () => {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vin: "",
    purchasePrice: "",
    gstAmount: "",
    vendorName: "",
    vendorAbn: "",
    purchaseDate: "",
    invoiceNumber: "",
  });

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      OCRService.terminate();
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const extractedData = await OCRService.processInvoice(file, (progress) => {
        setProcessingProgress(progress);
      });
      
      // Update form with extracted data
      setInvoiceData(prev => ({ ...prev, ...extractedData }));
      
      toast({
        title: "Document processed successfully",
        description: "Invoice data has been extracted and populated in the form.",
      });
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

  const handleDataUpdate = (data: Partial<InvoiceData>) => {
    setInvoiceData(prev => ({ ...prev, ...data }));
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
                Extract tax invoice data from PDFs and images automatically
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
                {Object.values(invoiceData).some(value => value !== "") && (
                  <Button variant="success" onClick={handleExport}>
                    Export Data
                  </Button>
                )}
              </div>
              <InvoiceForm data={invoiceData} onDataUpdate={handleDataUpdate} />
            </Card>

            {/* Processing Status */}
            {isProcessing && (
              <Card className="p-4 border-primary/20 bg-primary/5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm font-medium">
                      Processing document with AI extraction...
                    </p>
                  </div>
                  <Progress value={processingProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    {processingProgress < 25 ? 'Initializing OCR engine...' :
                     processingProgress < 75 ? 'Extracting text from document...' :
                     'Parsing invoice data...'}
                  </p>
                </div>
              </Card>
            )}
            
            {uploadedFile && !isProcessing && Object.values(invoiceData).some(value => value !== "") && (
              <Card className="p-4 border-success/20 bg-success/5">
                <div className="flex items-center gap-2 text-success">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <p className="text-sm font-medium">
                    Document processed successfully! Review and edit the extracted data.
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