import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ProcessingStatusProps {
  progress: number;
  fileName: string;
}

export const ProcessingStatus = ({ progress, fileName }: ProcessingStatusProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <h3 className="font-medium">Processing {fileName}</h3>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Extracting and analyzing document data...
          </p>
        </div>
      </CardContent>
    </Card>
  );
};