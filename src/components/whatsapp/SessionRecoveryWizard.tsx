import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { WahaSession } from '@/types/waha';
import { WizardState, RecoveryStep, ExecutionResult } from '@/types/recovery-wizard';
import { diagnoseSessions } from '@/lib/session-diagnostics';
import { wahaClient } from '@/lib/waha-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SessionRecoveryWizardProps {
  open: boolean;
  sessions: WahaSession[];
  onClose: () => void;
  onComplete: () => void;
}

export function SessionRecoveryWizard({
  open,
  sessions,
  onClose,
  onComplete,
}: SessionRecoveryWizardProps) {
  const [state, setState] = useState<WizardState>({
    currentStep: 'diagnosis',
    sessions,
    diagnosis: null,
    recoveryPlan: [],
    executionResults: [],
    requiresManualIntervention: false,
    manuallyFixedSessions: [],
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const steps: { key: RecoveryStep; label: string }[] = [
    { key: 'diagnosis', label: 'Diagnóstico' },
    { key: 'pre-recovery', label: 'Preparação' },
    { key: 'recovery', label: 'Recuperação' },
    { key: 'manual', label: 'Intervenção Manual' },
    { key: 'verification', label: 'Verificação' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === state.currentStep);

  const runDiagnosis = async () => {
    setIsProcessing(true);
    try {
      const diagnosis = await diagnoseSessions(sessions);
      setState(prev => ({ ...prev, diagnosis }));
      
      // Create recovery plan
      const plan = diagnosis.issues.map(issue => ({
        sessionId: issue.sessionId,
        action: issue.issueType === 'qr_expired' ? 'refresh_qr' as const :
                issue.issueType === 'reconnect_failed' ? 'reconnect' as const :
                'restart' as const,
        description: `Resolver: ${issue.description}`,
      }));
      
      setState(prev => ({ ...prev, recoveryPlan: plan }));
    } catch (error) {
      console.error('Diagnosis failed:', error);
      toast({
        title: 'Erro no diagnóstico',
        description: 'Não foi possível diagnosticar as sessões.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeRecovery = async () => {
    setIsProcessing(true);
    const results: ExecutionResult[] = [];

    for (const action of state.recoveryPlan) {
      try {
        const session = sessions.find(s => s.id === action.sessionId);
        if (!session) continue;

        if (action.action === 'refresh_qr') {
          const { qr } = await wahaClient.getQRCode(session.session_name);
          if (qr) {
            await supabase
              .from('evolution_instances')
              .update({ 
                qr_code: qr,
                qr_expires_at: new Date(Date.now() + 60000).toISOString()
              })
              .eq('id', session.id);
            
            results.push({
              sessionId: action.sessionId,
              action: action.action,
              status: 'success',
              message: 'QR code atualizado',
            });
          }
        } else if (action.action === 'reconnect') {
          await wahaClient.stopSession(session.session_name);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await supabase
            .from('evolution_instances')
            .update({ status: 'connecting', reconnect_attempts: 0 })
            .eq('id', session.id);
          
          results.push({
            sessionId: action.sessionId,
            action: action.action,
            status: 'success',
            message: 'Reconexão iniciada',
          });
        }
      } catch (error: any) {
        results.push({
          sessionId: action.sessionId,
          action: action.action,
          status: 'failed',
          message: error.message,
          needsManualIntervention: true,
        });
      }
    }

    setState(prev => ({
      ...prev,
      executionResults: results,
      requiresManualIntervention: results.some(r => r.needsManualIntervention),
    }));
    
    setIsProcessing(false);
  };

  const nextStep = () => {
    const currentIdx = steps.findIndex(s => s.key === state.currentStep);
    if (currentIdx < steps.length - 1) {
      const nextStep = steps[currentIdx + 1].key;
      setState(prev => ({ ...prev, currentStep: nextStep }));

      // Auto-execute actions for certain steps
      if (nextStep === 'diagnosis') {
        runDiagnosis();
      } else if (nextStep === 'recovery') {
        executeRecovery();
      }
    }
  };

  const handleClose = () => {
    if (state.currentStep === 'verification') {
      onComplete();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assistente de Recuperação de Sessões</DialogTitle>
          <DialogDescription>
            Siga os passos para recuperar suas sessões
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              {steps.map((step, idx) => (
                <div
                  key={step.key}
                  className={`flex items-center gap-2 ${
                    idx <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      idx < currentStepIndex ? 'bg-primary text-primary-foreground' :
                      idx === currentStepIndex ? 'bg-primary/20 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    {idx < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className="hidden md:inline">{step.label}</span>
                </div>
              ))}
            </div>
            <Progress value={((currentStepIndex + 1) / steps.length) * 100} />
          </div>

          <ScrollArea className="h-[400px]">
            {/* Step Content */}
            {state.currentStep === 'diagnosis' && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Analisando {sessions.length} sessão(ões)...
                  </AlertDescription>
                </Alert>

                {state.diagnosis && (
                  <div className="space-y-3">
                    <div className="font-semibold">Problemas Encontrados:</div>
                    {state.diagnosis.issues.map((issue, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{issue.sessionName}</div>
                          <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{issue.description}</div>
                        <div className="text-xs">
                          {issue.autoRecoverable ? (
                            <span className="text-green-600">✓ Recuperação automática disponível</span>
                          ) : (
                            <span className="text-yellow-600">⚠ Requer intervenção manual</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {state.currentStep === 'pre-recovery' && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Preparando para recuperar {state.recoveryPlan.length} sessão(ões)
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <div className="font-semibold">Ações Planejadas:</div>
                  {state.recoveryPlan.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                      <ArrowRight className="h-4 w-4" />
                      <span>{action.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.currentStep === 'recovery' && (
              <div className="space-y-4">
                {isProcessing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3">Executando recuperação...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="font-semibold">Resultados:</div>
                    {state.executionResults.map((result, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                        {result.status === 'success' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {sessions.find(s => s.id === result.sessionId)?.session_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{result.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {state.currentStep === 'verification' && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Recuperação concluída com sucesso!
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {state.executionResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-muted-foreground">Sessões Recuperadas</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {state.executionResults.filter(r => r.status === 'failed').length}
                    </div>
                    <div className="text-muted-foreground">Falharam</div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {state.currentStep === 'verification' ? 'Fechar' : 'Cancelar'}
            </Button>
            {state.currentStep !== 'verification' && (
              <Button
                onClick={state.currentStep === 'diagnosis' && !state.diagnosis ? runDiagnosis : nextStep}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Próximo'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
