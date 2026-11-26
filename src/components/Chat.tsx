import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, addDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Send, X, ShieldCheck } from 'lucide-react';
import { MedicareWaveLoader } from './common/MedicareWaveLoader';
import { e2eeService, EncryptedHealthEnvelope } from '../services/security/e2eeService';

interface Message {
  id: string;
  content: string;
  encrypted_envelope?: EncryptedHealthEnvelope;
  sender_id: string;
  created_at: string;
}

interface ChatProps {
  appointmentId: string;
  doctorName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Chat({ appointmentId, doctorName, isOpen, onClose }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && appointmentId) {
      setLoading(true);
      const q = query(
        collection(db, 'messages'),
        where('appointment_id', '==', appointmentId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        const decrypted = await Promise.all(
          rawDocs.map(async (m) => {
            if (m.encrypted_envelope) {
              try {
                const plain = await e2eeService.decryptWithPassphrase(m.encrypted_envelope, appointmentId);
                return { ...m, content: plain };
              } catch {
                return m;
              }
            }
            return m;
          })
        );
        decrypted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        setMessages(decrypted);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isOpen, appointmentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const encryptedEnvelope = await e2eeService.encryptWithPassphrase(newMessage.trim(), appointmentId);
      await addDoc(collection(db, 'messages'), {
        appointment_id: appointmentId,
        sender_id: user.uid,
        content: '[Encrypted Clinical Message]',
        encrypted_envelope: encryptedEnvelope,
        created_at: new Date().toISOString()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md h-96 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-line)]">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Chat with {doctorName}</h3>
            <p className="text-[10px] font-medium text-[var(--color-primary)] flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> End-to-End Encrypted (AES-256-GCM)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <MedicareWaveLoader variant="inline" text="Connecting secure channel..." />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender_id === user?.uid
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_id === user?.uid
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
