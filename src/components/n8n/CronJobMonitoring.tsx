import { useCronJobMonitoring } from '@/hooks/useCronJobMonitoring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, CheckCircle2, XCircle, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CronJobMonitoring() {
  const { jobs, loading, error, refetch } = useCronJobMonitoring();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <p>Erro ao carregar jobs agendados: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalExecutions = jobs.length;
  const successfulJobs = jobs.filter(j => j.status === 'succeeded').length;
  const failedJobs = jobs.filter(j => j.status !== 'succeeded' && j.status !== null).length;
  const successRate = totalExecutions > 0 ? (successfulJobs / totalExecutions) * 100 : 0;
  const avgDuration = jobs.length > 0
    ? jobs.reduce((sum, j) => sum + (j.execution_seconds || 0), 0) / jobs.length
    : 0;
  const lastFailure = jobs.find(j => j.status !== 'succeeded' && j.status !== null);

  // Group jobs by name
  const jobsByName = jobs.reduce((acc, job) => {
    const name = job.jobname || 'unknown';
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(job);
    return acc;
  }, {} as Record<string, typeof jobs>);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Execuções</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{successfulJobs} sucessos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration.toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground">Por execução</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Última Falha</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {lastFailure ? (
              <>
                <div className="text-2xl font-bold text-destructive">
                  {formatDistanceToNow(new Date(lastFailure.start_time!), { locale: ptBR })}
                </div>
                <p className="text-xs text-muted-foreground truncate">{lastFailure.jobname}</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-success">N/A</div>
                <p className="text-xs text-muted-foreground">Nenhuma falha</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Execution Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execuções Recentes</CardTitle>
              <CardDescription>Histórico de jobs agendados das últimas 24 horas</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma execução registrada</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Job</TableHead>
                    <TableHead>Agendamento</TableHead>
                    <TableHead>Última Execução</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(jobsByName).map(([jobName, jobExecutions]) => {
                    const latestExecution = jobExecutions[0];
                    return (
                      <TableRow key={jobName}>
                        <TableCell className="font-medium">{jobName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {latestExecution.schedule || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {latestExecution.start_time ? (
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(latestExecution.start_time), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {latestExecution.execution_seconds !== null ? (
                            <Badge variant="secondary">
                              {latestExecution.execution_seconds.toFixed(2)}s
                            </Badge>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {latestExecution.status === 'succeeded' ? (
                            <Badge variant="default" className="bg-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Sucesso
                            </Badge>
                          ) : latestExecution.status ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Falha
                            </Badge>
                          ) : (
                            <Badge variant="outline">Desconhecido</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Ver Detalhes
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96">
                              <div className="space-y-2">
                                <h4 className="font-semibold">Detalhes da Execução</h4>
                                <div className="text-sm space-y-1">
                                  <p>
                                    <strong>Job:</strong> {jobName}
                                  </p>
                                  <p>
                                    <strong>Agendamento:</strong> {latestExecution.schedule}
                                  </p>
                                  <p>
                                    <strong>Início:</strong>{' '}
                                    {latestExecution.start_time
                                      ? new Date(latestExecution.start_time).toLocaleString('pt-BR')
                                      : 'N/A'}
                                  </p>
                                  <p>
                                    <strong>Fim:</strong>{' '}
                                    {latestExecution.end_time
                                      ? new Date(latestExecution.end_time).toLocaleString('pt-BR')
                                      : 'N/A'}
                                  </p>
                                  <p>
                                    <strong>Execuções (24h):</strong> {jobExecutions.length}
                                  </p>
                                </div>
                                {latestExecution.return_message && (
                                  <div className="mt-3">
                                    <strong className="text-sm">Mensagem:</strong>
                                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                                      {latestExecution.return_message}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}