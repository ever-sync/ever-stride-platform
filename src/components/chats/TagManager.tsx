import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export function TagManager() {
  const { userSession } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3B82F6");
  const [tagDescription, setTagDescription] = useState("");

  useEffect(() => {
    if (userSession?.tenant?.id) {
      loadTags();
    }
  }, [userSession]);

  const loadTags = async () => {
    if (!userSession?.tenant?.id) return;

    const { data, error } = await supabase
      .from("chat_tags")
      .select("*")
      .eq("tenant_id", userSession.tenant.id)
      .order("name");

    if (error) {
      console.error("Error loading tags:", error);
      return;
    }

    setTags(data || []);
  };

  const handleSave = async () => {
    if (!userSession?.tenant?.id || !tagName.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o nome da tag",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTag) {
        const { error } = await supabase
          .from("chat_tags")
          .update({
            name: tagName,
            color: tagColor,
            description: tagDescription || null,
          })
          .eq("id", editingTag.id);

        if (error) throw error;

        toast({
          title: "Tag atualizada",
          description: "A tag foi atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("chat_tags")
          .insert({
            tenant_id: userSession.tenant.id,
            name: tagName,
            color: tagColor,
            description: tagDescription || null,
          });

        if (error) throw error;

        toast({
          title: "Tag criada",
          description: "A tag foi criada com sucesso",
        });
      }

      resetForm();
      loadTags();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a tag",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from("chat_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;

      toast({
        title: "Tag removida",
        description: "A tag foi removida com sucesso",
      });

      loadTags();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover a tag",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor("#3B82F6");
    setTagDescription("");
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagDescription(tag.description || "");
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Gerenciar Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags de Conversas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">{editingTag ? "Editar Tag" : "Nova Tag"}</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome</label>
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Ex: Vendas, Suporte..."
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cor</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Descrição (opcional)</label>
              <Input
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                placeholder="Descrição da tag..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                {editingTag ? "Atualizar" : "Criar"} Tag
              </Button>
              {editingTag && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <div>
            <h3 className="font-semibold mb-3">Tags Existentes</h3>
            <div className="space-y-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tag criada ainda
                </p>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge style={{ backgroundColor: tag.color, color: "#fff" }}>
                        {tag.name}
                      </Badge>
                      {tag.description && (
                        <span className="text-sm text-muted-foreground">
                          {tag.description}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(tag)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
