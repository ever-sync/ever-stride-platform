import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotificationOptions {
  enableSound?: boolean;
  enableToast?: boolean;
}

export function useNotifications(options: NotificationOptions = {}) {
  const { userSession } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ4PVKzn77BdGAg+ltzy0H8pBSh+zPLaizsIGGS57OihUxELTKXh8bllHAU2jdXzzn0sBSp7yvLekTYIGGe67OOdUREMUqvl8LNXFA4/mtzy0H8qBSh+zPLajjsIGGS67eOfUxIMUqvm8bJYFA4+m9zzz38rBSh9y/PbizwHGGW67eOdUhILUqzm8LJXFA0+m9vy0H8rBSh9y/PaiDwIG2a37+OaUxIOUqvm87NZEw4+nNvy0H0qBCh9y/PaiDsJG2a37+OaUxMMUq3m87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4+nNvy0H8rBSh9y/PaiDsJG2a37+OaUxIOUqvm87NZEw4=');
  }, []);

  useEffect(() => {
    if (!userSession?.tenant?.id) return;

    // Subscribe to new messages in all chats of this tenant
    const channel = supabase
      .channel('new-messages-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          // Verify if message belongs to tenant's chat
          const { data: chat } = await supabase
            .from('chats')
            .select('tenant_id, phone')
            .eq('id', payload.new.chat_id)
            .single();

          if (chat && chat.tenant_id === userSession.tenant?.id) {
            setHasNewMessage(true);
            
            // Play notification sound
            if (options.enableSound !== false && audioRef.current) {
              try {
                audioRef.current.volume = 0.3;
                audioRef.current.play().catch(err => {
                  console.log('Cannot play notification sound:', err);
                });
              } catch (error) {
                console.log('Audio playback failed:', error);
              }
            }

            // Show toast notification
            if (options.enableToast !== false) {
              const message = payload.new.user_message || payload.new.bot_message;
              toast({
                title: "Nova mensagem",
                description: `${chat.phone}: ${message?.substring(0, 50)}${message?.length > 50 ? '...' : ''}`,
              });
            }

            // Clear notification flag after 3 seconds
            setTimeout(() => setHasNewMessage(false), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userSession, options.enableSound, options.enableToast, toast]);

  return { hasNewMessage };
}
