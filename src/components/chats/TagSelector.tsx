import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatTag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  chatId: number;
  selectedTags?: ChatTag[];
  onTagsChange?: () => void;
}

export function TagSelector({ chatId, selectedTags = [], onTagsChange }: TagSelectorProps) {
  const { userSession } = useAuth();
  const { toast } = useToast();
  const [allTags, setAllTags] = useState<ChatTag[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>(selectedTags.map(t => t.id));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userSession?.tenant?.id) {
      loadTags();
      loadAppliedTags();
    }
  }, [userSession, chatId]);

  const loadTags = async () => {
    if (!userSession?.tenant?.id) return;

    const { data, error } = await supabase
      .from("chat_tags")
      .select("id, name, color")
      .eq("tenant_id", userSession.tenant.id)
      .order("name");

    if (error) {
      console.error("Error loading tags:", error);
      return;
    }

    setAllTags(data || []);
  };

  const loadAppliedTags = async () => {
    const { data, error } = await supabase
      .from("chat_tags_mapping")
      .select("tag_id")
      .eq("chat_id", chatId);

    if (error) {
      console.error("Error loading applied tags:", error);
      return;
    }

    setAppliedTags(data.map(m => m.tag_id));
  };

  const toggleTag = async (tagId: string) => {
    setLoading(true);
    try {
      const isApplied = appliedTags.includes(tagId);

      if (isApplied) {
        // Remove tag
        const { error } = await supabase
          .from("chat_tags_mapping")
          .delete()
          .eq("chat_id", chatId)
          .eq("tag_id", tagId);

        if (error) throw error;

        setAppliedTags(prev => prev.filter(id => id !== tagId));
      } else {
        // Add tag
        const { error } = await supabase
          .from("chat_tags_mapping")
          .insert({
            chat_id: chatId,
            tag_id: tagId,
          });

        if (error) throw error;

        setAppliedTags(prev => [...prev, tagId]);
      }

      onTagsChange?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar as tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const appliedTagObjects = allTags.filter(t => appliedTags.includes(t.id));

  return (
    <div className="flex items-center gap-2">
      {appliedTagObjects.map((tag) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color, color: "#fff" }}
          className="text-xs"
        >
          {tag.name}
        </Badge>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <Tag className="h-4 w-4 mr-1" />
            Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Selecionar Tags</h4>
            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma tag disponível
              </p>
            ) : (
              <div className="space-y-1">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-left",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                    {appliedTags.includes(tag.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
