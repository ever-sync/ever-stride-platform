import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface QuickReplyTemplate {
  id: string;
  name: string;
  content: string;
  category: string | null;
  shortcut: string | null;
}

interface QuickReplySelectorProps {
  onSelect: (content: string) => void;
}

export function QuickReplySelector({ onSelect }: QuickReplySelectorProps) {
  const { userSession } = useAuth();
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickReplyTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "",
    shortcut: ""
  });

  useEffect(() => {
    if (userSession?.tenant?.id && isOpen) {
      loadTemplates();
    }
  }, [userSession, isOpen]);

  const loadTemplates = async () => {
    if (!userSession?.tenant?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quick_reply_templates")
        .select("*")
        .eq("tenant_id", userSession.tenant.id)
        .order("category, name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar templates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userSession?.tenant?.id || !formData.name || !formData.content) {
      toast.error("Nome e conteúdo são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingTemplate) {
        const { error } = await supabase
          .from("quick_reply_templates")
          .update({
            name: formData.name,
            content: formData.content,
            category: formData.category || null,
            shortcut: formData.shortcut || null
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template atualizado");
      } else {
        const { error } = await supabase
          .from("quick_reply_templates")
          .insert({
            tenant_id: userSession.tenant.id,
            name: formData.name,
            content: formData.content,
            category: formData.category || null,
            shortcut: formData.shortcut || null,
            created_by: user?.id
          });

        if (error) throw error;
        toast.success("Template criado");
      }

      setShowDialog(false);
      setEditingTemplate(null);
      setFormData({ name: "", content: "", category: "", shortcut: "" });
      loadTemplates();
    } catch (error: any) {
      toast.error("Erro ao salvar template: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("quick_reply_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template excluído");
      loadTemplates();
    } catch (error: any) {
      toast.error("Erro ao excluir template: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: QuickReplyTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category || "",
      shortcut: template.shortcut || ""
    });
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({ name: "", content: "", category: "", shortcut: "" });
    setShowDialog(true);
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || "Geral";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, QuickReplyTemplate[]>);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Respostas Rápidas
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Respostas Rápidas</SheetTitle>
            <SheetDescription>
              Selecione um template para inserir no campo de mensagem
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <Button onClick={handleNew} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>

            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando templates...
                </div>
              ) : Object.keys(groupedTemplates).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum template cadastrado
                </div>
              ) : (
                <div className="space-y-6 pr-4">
                  {Object.entries(groupedTemplates).map(([category, templates]) => (
                    <div key={category}>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="p-3 border rounded-lg hover:bg-accent group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-sm">{template.name}</h5>
                                  {template.shortcut && (
                                    <Badge variant="outline" className="text-xs">
                                      /{template.shortcut}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(template)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {template.content}
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                onSelect(template.content);
                                setIsOpen(false);
                                toast.success("Template inserido");
                              }}
                              className="w-full"
                            >
                              Usar Template
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              Crie templates de respostas para facilitar o atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Saudação Inicial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Saudações, Despedidas, FAQ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortcut">Atalho (opcional)</Label>
              <Input
                id="shortcut"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                placeholder="Ex: oi, tchau, info"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Use /{formData.shortcut || "atalho"} para inserir rapidamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo da Mensagem</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Digite a mensagem do template..."
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {editingTemplate ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
