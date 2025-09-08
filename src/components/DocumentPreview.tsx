import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Image, Eye } from "lucide-react";

interface DocumentPreviewProps {
  file: File;
}

export const DocumentPreview = ({ file }: DocumentPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [fileType, setFileType] = useState<"pdf" | "image">("image");

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFileType(file.type === "application/pdf" ? "pdf" : "image");
      
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* File Info */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <div className="p-2 rounded-lg bg-primary/10">
          {fileType === "pdf" ? (
            <FileText className="h-5 w-5 text-primary" />
          ) : (
            <Image className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} • {fileType.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Preview */}
      <Card className="relative overflow-hidden shadow-document">
        <div className="aspect-[4/5] max-h-96 overflow-hidden">
          {fileType === "pdf" ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="text-center space-y-2">
                <div className="p-4 rounded-full bg-primary/10 mx-auto w-fit">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">PDF Preview</p>
                <p className="text-sm text-muted-foreground">
                  Document uploaded successfully
                </p>
              </div>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Document preview"
              className="w-full h-full object-contain bg-muted"
            />
          )}
        </div>

        {/* Processing Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        
        <div className="absolute bottom-2 right-2">
          <div className="px-2 py-1 rounded bg-primary/90 text-primary-foreground text-xs font-medium">
            Processing...
          </div>
        </div>
      </Card>
    </div>
  );
};