import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Loader2 } from 'lucide-react';

interface NotificationPreferences {
  n8n_alerts?: {
    enabled: boolean;
    channels: string[];
    email?: string;
    severity_levels: string[];
  };
}

export function N8NNotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    n8n_alerts: {
      enabled: false,
      channels: ['email'],
      email: '',
      severity_levels: ['critical', 'down']
    }
  });

  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('notification_preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data?.notification_preferences) {
          setPreferences(data.notification_preferences as NotificationPreferences);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_preferences: preferences as any
        });

      if (error) throw error;

      toast({
        title: 'Preferências salvas',
        description: 'Suas configurações de notificação foram atualizadas.'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas preferências.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-n8n-alert', {
        body: {
          status: 'down',
          error: 'This is a test notification',
          responseTime: 5000,
          circuitBreakerState: 'OPEN',
          reason: 'Test notification triggered by user',
          isTest: true
        }
      });

      if (error) throw error;

      toast({
        title: 'Notificação de teste enviada',
        description: 'Verifique seu email para confirmar o recebimento.'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Erro ao enviar teste',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificações N8N</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notificações de Saúde N8N</CardTitle>
        </div>
        <CardDescription>
          Configure alertas automáticos quando o status do N8N mudar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="n8n-alerts-enabled">Ativar Alertas</Label>
            <p className="text-sm text-muted-foreground">
              Receber notificações quando o N8N apresentar problemas
            </p>
          </div>
          <Switch
            id="n8n-alerts-enabled"
            checked={preferences.n8n_alerts?.enabled || false}
            onCheckedChange={(checked) => {
              setPreferences({
                ...preferences,
                n8n_alerts: {
                  ...preferences.n8n_alerts!,
                  enabled: checked
                }
              });
            }}
          />
        </div>

        {/* Email Configuration */}
        {preferences.n8n_alerts?.enabled && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email para Notificações
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu-email@example.com"
                value={preferences.n8n_alerts?.email || ''}
                onChange={(e) => {
                  setPreferences({
                    ...preferences,
                    n8n_alerts: {
                      ...preferences.n8n_alerts!,
                      email: e.target.value
                    }
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Email onde você receberá os alertas de saúde do N8N
              </p>
            </div>

            {/* Severity Levels */}
            <div className="space-y-2">
              <Label>Níveis de Severidade</Label>
              <div className="space-y-2">
                {['critical', 'down', 'degraded', 'recovery'].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Switch
                      id={`severity-${level}`}
                      checked={preferences.n8n_alerts?.severity_levels?.includes(level) || false}
                      onCheckedChange={(checked) => {
                        const currentLevels = preferences.n8n_alerts?.severity_levels || [];
                        const newLevels = checked
                          ? [...currentLevels, level]
                          : currentLevels.filter(l => l !== level);
                        
                        setPreferences({
                          ...preferences,
                          n8n_alerts: {
                            ...preferences.n8n_alerts!,
                            severity_levels: newLevels
                          }
                        });
                      }}
                    />
                    <Label htmlFor={`severity-${level}`} className="capitalize">
                      {level === 'critical' && '🔴 Crítico'}
                      {level === 'down' && '❌ Fora do Ar'}
                      {level === 'degraded' && '⚠️ Degradado'}
                      {level === 'recovery' && '✅ Recuperado'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Preferências
          </Button>
          {preferences.n8n_alerts?.enabled && (
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={testing || !preferences.n8n_alerts?.email}
            >
              {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Testar Notificação
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}