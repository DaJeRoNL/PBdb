'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Mail, ArrowRightLeft, Briefcase, UserPlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Notification {
  id: string;
  user_id: string;
  type: 'mention' | 'handoff' | 'submission_update' | 'candidate_update' | 'position_alert';
  title: string;
  message: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  isCollapsed?: boolean;
}

export default function NotificationBell({ isCollapsed = false }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
            await loadNotifications(user.id);
            setupSubscription(user.id);
        } else {
            setLoading(false);
        }
    };
    init();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  const loadNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSubscription = (userId: string) => {
    if (subscriptionRef.current) return;

    const channel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: { new: Notification }) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'handoff':
        return <ArrowRightLeft className="w-4 h-4 text-purple-600" />;
      case 'submission_update':
        return <Briefcase className="w-4 h-4 text-green-600" />;
      case 'candidate_update':
        return <UserPlus className="w-4 h-4 text-orange-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isCollapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors relative w-full flex justify-center group"
        >
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-white' : 'text-gray-300'}`} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white w-full"
      >
        <div className="relative">
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-white' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className={`font-medium ${unreadCount > 0 ? 'text-white' : ''}`}>Notifications</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 bottom-full mb-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center">
                   <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                   <p className="text-xs text-gray-500">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium text-gray-500">No new notifications</p>
                  <p className="text-xs mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-all ${
                        !notification.is_read ? 'bg-blue-50/60' : 'bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 p-1.5 rounded-full h-fit flex-shrink-0 ${
                           !notification.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'
                        }`}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                             <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                               {notification.title}
                             </p>
                             {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>}
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}