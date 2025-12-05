import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../../types';
import { Send, ArrowLeft, Car, Headphones, MoreVertical } from 'lucide-react';
import Button from '../ui/Button';

interface ChatThreadProps {
  chat: ChatSession;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (body: string) => void;
  onBack?: () => void;
  isSending?: boolean;
}

export function ChatThread({
  chat,
  messages,
  currentUserId,
  currentUserName,
  onSendMessage,
  onBack,
  isSending = false,
}: ChatThreadProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [chat.chat_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !isSending) {
      onSendMessage(trimmed);
      setInputValue('');
    }
  };

  const formatMessageTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const getOtherParticipantName = (): string => {
    const otherId = chat.participant_ids.find((id) => id !== currentUserId);
    if (otherId && chat.participant_display_names) {
      return chat.participant_display_names[otherId] || 'Unknown';
    }
    return 'Unknown';
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  
  messages.forEach((msg) => {
    const msgDate = new Date(msg.sent_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.sent_at, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        
        <div className="flex items-center gap-2 flex-1">
          {chat.type === 'booking' ? (
            <Car className="w-5 h-5 text-blue-500" />
          ) : (
            <Headphones className="w-5 h-5 text-purple-500" />
          )}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {getOtherParticipantName()}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {chat.type === 'booking' ? 'Trip Chat' : 'Support Chat'}
              {chat.booking_id && ` • ${chat.booking_id}`}
            </p>
          </div>
        </div>

        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Date separator */}
              <div className="flex items-center justify-center mb-4">
                <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {formatMessageDate(group.date)}
                </span>
              </div>

              {/* Messages in group */}
              <div className="space-y-2">
                {group.messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUserId;

                  return (
                    <div
                      key={message.message_id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[75%] rounded-2xl px-4 py-2
                          ${isOwnMessage
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                          }
                        `}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            {message.sender_display_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={`
                            text-xs mt-1
                            ${isOwnMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}
                          `}
                        >
                          {formatMessageTime(message.sent_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          className="
            flex-1 px-4 py-2 rounded-full
            bg-gray-100 dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50
          "
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isSending}
          className="!p-2 !rounded-full"
          aria-label="Send message"
        >
          <Send className={`w-5 h-5 ${isSending ? 'animate-pulse' : ''}`} />
        </Button>
      </form>
    </div>
  );
}

export default ChatThread;
