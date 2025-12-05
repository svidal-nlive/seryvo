import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, Message } from '../../types';
import { backend } from '../../services/backend';
import { ChatList } from './ChatList';
import { ChatThread } from './ChatThread';
import { MessageSquare } from 'lucide-react';
import Card from '../ui/Card';

interface MessagingViewProps {
  userId: string;
  userName: string;
}

export function MessagingView({ userId, userName }: MessagingViewProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch user's chats
  const fetchChats = useCallback(async () => {
    try {
      const userChats = await backend.getChats(userId);
      setChats(userChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const chatMessages = await backend.getMessages(chatId);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId, fetchMessages]);

  // Polling for new messages (every 5 seconds when a chat is selected)
  useEffect(() => {
    if (!selectedChatId) return;

    const interval = setInterval(() => {
      fetchMessages(selectedChatId);
      fetchChats(); // Also refresh chat list for last_message updates
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedChatId, fetchMessages, fetchChats]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleBack = () => {
    setSelectedChatId(null);
    setMessages([]);
  };

  const handleSendMessage = async (body: string) => {
    if (!selectedChatId) return;

    setSending(true);
    try {
      const newMessage = await backend.sendMessage(selectedChatId, userId, userName, body);
      setMessages((prev) => [...prev, newMessage]);
      // Also refresh chat list to update last_message
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const selectedChat = chats.find((c) => c.chat_id === selectedChatId);

  if (loading) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" noPadding>
      <div className="flex h-[500px]">
        {/* Chat List - hidden on mobile when chat is selected */}
        <div
          className={`
            w-full md:w-80 border-r border-gray-200 dark:border-gray-700
            ${selectedChatId ? 'hidden md:block' : 'block'}
          `}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Messages</h2>
              {chats.length > 0 && (
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 53px)' }}>
            <ChatList
              chats={chats}
              currentUserId={userId}
              selectedChatId={selectedChatId ?? undefined}
              onSelectChat={handleSelectChat}
            />
          </div>
        </div>

        {/* Chat Thread - full width on mobile when selected */}
        <div
          className={`
            flex-1
            ${selectedChatId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}
          `}
        >
          {selectedChat ? (
            loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ChatThread
                chat={selectedChat}
                messages={messages}
                currentUserId={userId}
                currentUserName={userName}
                onSendMessage={handleSendMessage}
                onBack={handleBack}
                isSending={sending}
              />
            )
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose from your existing conversations to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default MessagingView;
