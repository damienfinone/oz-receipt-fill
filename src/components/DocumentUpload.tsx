import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface DocumentUploadProps {
  onFileUpload: (file: File) => void;
}

export const DocumentUpload = ({ onFileUpload }: DocumentUploadProps) => {
  const { toast } = useToast();
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      onFileUpload(file);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded and is being processed.`,
      });
    }
  }, [onFileUpload, toast]);

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const getDropzoneStyle = () => {
    if (isDragReject) return "border-destructive bg-destructive/5";
    if (isDragAccept) return "border-success bg-success/5 shadow-upload";
    if (isDragActive) return "border-primary bg-primary/5";
    return "border-border hover:border-primary/50";
  };

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-300 ease-bounce
        ${getDropzoneStyle()}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        <div className="flex justify-center">
          {isDragReject ? (
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          ) : isDragAccept ? (
            <div className="p-4 rounded-full bg-success/10">
              <Upload className="h-12 w-12 text-success animate-bounce" />
            </div>
          ) : (
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-12 w-12 text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {isDragActive ? "Drop your file here" : "Upload Vehicle Invoice"}
          </h3>
          <p className="text-muted-foreground">
            Drag and drop your PDF or image file, or click to browse
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            PDF
          </div>
          <div className="flex items-center gap-1">
            <Image className="h-4 w-4" />
            Images
          </div>
        </div>

        <Button variant="outline" className="mt-4">
          Choose File
        </Button>

        <p className="text-xs text-muted-foreground">
          Maximum file size: 10MB
        </p>
      </div>
    </div>
  );
};