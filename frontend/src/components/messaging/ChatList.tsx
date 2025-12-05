import React from 'react';
import { ChatSession } from '../../types';
import { MessageSquare, Car, Headphones } from 'lucide-react';

interface ChatListProps {
  chats: ChatSession[];
  currentUserId: string;
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
}

export function ChatList({ chats, currentUserId, selectedChatId, onSelectChat }: ChatListProps) {
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getOtherParticipantName = (chat: ChatSession): string => {
    const otherId = chat.participant_ids.find((id) => id !== currentUserId);
    if (otherId && chat.participant_display_names) {
      return chat.participant_display_names[otherId] || 'Unknown';
    }
    return 'Unknown';
  };

  const getChatIcon = (type: ChatSession['type']) => {
    switch (type) {
      case 'booking':
        return <Car className="w-5 h-5 text-blue-500" />;
      case 'support':
        return <Headphones className="w-5 h-5 text-purple-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-500" />;
    }
  };

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {chats.map((chat) => {
        const isSelected = selectedChatId === chat.chat_id;
        const hasUnread = chat.unread_count && chat.unread_count > 0;
        const otherName = getOtherParticipantName(chat);

        return (
          <button
            key={chat.chat_id}
            onClick={() => onSelectChat(chat.chat_id)}
            className={`
              w-full px-4 py-3 text-left transition-colors
              hover:bg-gray-50 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
              ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getChatIcon(chat.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      text-sm font-medium truncate
                      ${hasUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    {otherName}
                  </span>
                  {chat.last_message && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(chat.last_message.sent_at)}
                    </span>
                  )}
                </div>

                {/* Last message preview */}
                {chat.last_message && (
                  <p
                    className={`
                      text-sm truncate mt-0.5
                      ${hasUnread ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}
                    `}
                  >
                    {chat.last_message.sender_id === currentUserId && (
                      <span className="text-gray-400 dark:text-gray-500">You: </span>
                    )}
                    {chat.last_message.body}
                  </p>
                )}

                {/* Chat type badge */}
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`
                      text-xs px-1.5 py-0.5 rounded
                      ${chat.type === 'booking' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}
                    `}
                  >
                    {chat.type === 'booking' ? 'Trip Chat' : 'Support'}
                  </span>
                  {hasUnread && (
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ChatList;
