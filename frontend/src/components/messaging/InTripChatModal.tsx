/**
 * Seryvo Platform - In-Trip Chat Modal
 * Real-time messaging between client and driver during an active booking.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Loader2, MessageCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { backend } from '../../services/backend';
import { useAuth } from '../../contexts/AuthContext';
import type { Booking, ChatSession, Message } from '../../types';

interface InTripChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  /** The other party's name (client name for driver, driver name for client) */
  otherPartyName?: string;
}

export default function InTripChatModal({
  isOpen,
  onClose,
  booking,
  otherPartyName = 'the other party',
}: InTripChatModalProps) {
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initialize or get existing chat
  useEffect(() => {
    if (!isOpen || !user) return;

    const initChat = async () => {
      setLoading(true);
      try {
        // Get or create the booking chat
        const participants = [
          { id: user.id, name: user.full_name || user.email },
        ];

        // Add the other participant based on user role
        if (user.role === 'client' && booking.driver_id) {
          participants.push({
            id: booking.driver_id,
            name: otherPartyName,
          });
        } else if (user.role === 'driver' && booking.client_id) {
          participants.push({
            id: booking.client_id,
            name: otherPartyName,
          });
        }

        const chatSession = await backend.createOrGetBookingChat(
          booking.booking_id,
          participants
        );
        setChat(chatSession);

        // Load existing messages
        const existingMessages = await backend.getMessages(chatSession.chat_id);
        setMessages(existingMessages);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [isOpen, user, booking, otherPartyName]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!isOpen || !chat) return;

    const interval = setInterval(async () => {
      try {
        const updatedMessages = await backend.getMessages(chat.chat_id);
        setMessages(updatedMessages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, chat]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, loading]);

  const handleSend = async () => {
    if (!newMessage.trim() || !chat || !user || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await backend.sendMessage(
        chat.chat_id,
        user.id,
        user.full_name || user.email,
        messageText
      );
      setMessages((prev) => [...prev, sentMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore the message if sending failed
      setNewMessage(messageText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chat with ${otherPartyName}`} size="md">
      <div className="flex flex-col h-[400px] -mx-4 -mb-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
              <MessageCircle size={48} className="mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.message_id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-3 py-2 rounded-2xl
                      ${isOwn
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md'
                      }
                    `}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.sender_display_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400 dark:text-slate-500'}`}
                    >
                      {formatTime(msg.sent_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
              disabled={loading || sending}
              maxLength={1000}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || loading || sending}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
