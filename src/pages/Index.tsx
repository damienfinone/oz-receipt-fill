import { useState } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { InvoiceForm } from "@/components/InvoiceForm";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Car, DollarSign } from "lucide-react";

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    // In a real implementation, this would trigger OCR processing
    // For now, we'll simulate with mock data
    setTimeout(() => {
      setInvoiceData({
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehicleYear: "2023",
        vin: "JTDBF3FG5P0123456",
        purchasePrice: "35000.00",
        gstAmount: "3500.00",
        vendorName: "ABC Motors Pty Ltd",
        vendorAbn: "12 345 678 901",
        purchaseDate: "2024-01-15",
        invoiceNumber: "INV-2024-001",
      });
    }, 2000);
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
            {uploadedFile && (
              <Card className="p-4 border-success/20 bg-success/5">
                <div className="flex items-center gap-2 text-success">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <p className="text-sm font-medium">
                    Processing document... Data will appear shortly
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