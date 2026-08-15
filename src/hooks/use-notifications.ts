import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export interface Notification {
  id: string;
  type: 'gate_completed' | 'exception' | 'status_change';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  project_id: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast(newNotif.title, {
            description: newNotif.message,
            // Icons should be handled by the toast implementation or passed as components
            // but here we just pass the type in metadata if needed
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erro ao buscar notificações:", error);
      return;
    }

    setNotifications(data as Notification[]);
    setUnreadCount(data.filter(n => !n.is_read).length);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      toast.error("Erro ao marcar como lida.");
      return;
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, markAsRead };
}
