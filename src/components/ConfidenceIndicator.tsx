import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  confidence: number;
  fieldName?: string;
  isLowConfidence?: boolean;
}

export function ConfidenceIndicator({ confidence, fieldName, isLowConfidence }: ConfidenceIndicatorProps) {
  const getConfidenceLevel = () => {
    if (confidence >= 90) return 'high';
    if (confidence >= 70) return 'medium';
    return 'low';
  };

  const level = getConfidenceLevel();
  const isFieldLowConfidence = isLowConfidence || level === 'low';

  const getIcon = () => {
    if (isFieldLowConfidence) return <XCircle className="h-3 w-3" />;
    if (level === 'medium') return <AlertTriangle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const getVariant = () => {
    if (isFieldLowConfidence) return 'destructive';
    if (level === 'medium') return 'secondary';
    return 'default';
  };

  const getText = () => {
    if (fieldName && isFieldLowConfidence) return 'Please verify';
    if (level === 'high') return `${confidence}%`;
    if (level === 'medium') return `${confidence}%`;
    return `${confidence}%`;
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn(
        "text-xs flex items-center gap-1",
        isFieldLowConfidence && "animate-pulse"
      )}
    >
      {getIcon()}
      {getText()}
    </Badge>
  );
}