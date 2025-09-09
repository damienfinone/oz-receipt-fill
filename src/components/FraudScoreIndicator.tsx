import { Shield, ShieldAlert, ShieldX, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FraudIndicator {
  type: 'critical' | 'warning' | 'info';
  field: string;
  message: string;
  severity: number;
}

interface FraudScoreIndicatorProps {
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  fraudIndicators: FraudIndicator[];
  className?: string;
}

export function FraudScoreIndicator({ 
  fraudScore, 
  riskLevel, 
  fraudIndicators, 
  className 
}: FraudScoreIndicatorProps) {
  const getScoreIcon = () => {
    switch (riskLevel) {
      case 'low':
        return <Shield className="h-4 w-4" />;
      case 'medium':
        return <ShieldAlert className="h-4 w-4" />;
      case 'high':
        return <ShieldX className="h-4 w-4" />;
    }
  };

  const getScoreVariant = () => {
    switch (riskLevel) {
      case 'low':
        return 'success';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
    }
  };

  const getScoreColor = () => {
    switch (riskLevel) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-destructive';
    }
  };

  const criticalCount = fraudIndicators.filter(i => i.type === 'critical').length;
  const warningCount = fraudIndicators.filter(i => i.type === 'warning').length;
  const infoCount = fraudIndicators.filter(i => i.type === 'info').length;

  return (
    <TooltipProvider>
      <Card className={cn("p-4 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-bold", getScoreColor())}>
              {fraudScore}
            </span>
            <div className="text-sm text-muted-foreground">
              <div>Fraud Score</div>
              <div className="text-xs capitalize">{riskLevel} Risk</div>
            </div>
          </div>
          
          <Badge variant={getScoreVariant() as any} className="flex items-center gap-1">
            {getScoreIcon()}
            {riskLevel.toUpperCase()}
          </Badge>
        </div>

        {fraudIndicators.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Issues Detected:</div>
            <div className="flex flex-wrap gap-2">
              {criticalCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="text-xs">
                      {criticalCount} Critical
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {fraudIndicators
                        .filter(i => i.type === 'critical')
                        .map((indicator, idx) => (
                          <div key={idx} className="text-xs">
                            {indicator.field}: {indicator.message}
                          </div>
                        ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {warningCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs bg-warning text-warning-foreground">
                      {warningCount} Warning{warningCount > 1 ? 's' : ''}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {fraudIndicators
                        .filter(i => i.type === 'warning')
                        .map((indicator, idx) => (
                          <div key={idx} className="text-xs">
                            {indicator.field}: {indicator.message}
                          </div>
                        ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {infoCount > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs">
                      {infoCount} Info
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {fraudIndicators
                        .filter(i => i.type === 'info')
                        .map((indicator, idx) => (
                          <div key={idx} className="text-xs">
                            {indicator.field}: {indicator.message}
                          </div>
                        ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {fraudIndicators.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-success">
            <Shield className="h-4 w-4" />
            No fraud indicators detected
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}