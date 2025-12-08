import { useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Search,
  Ticket,
  CheckCircle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import CreateTicketModal from '../components/support/CreateTicketModal';
import MyTicketsList from '../components/support/MyTicketsList';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'How do I book a ride?',
    answer: 'To book a ride, tap "Book Now" on your dashboard, enter your pickup and destination locations, select your preferred vehicle type, and confirm your booking. You can also schedule rides in advance.',
    category: 'Booking',
  },
  {
    id: '2',
    question: 'How do I cancel a booking?',
    answer: 'You can cancel a booking from your "My Bookings" tab. Note that cancellation fees may apply depending on how close to the pickup time you cancel. Check our cancellation policy for details.',
    category: 'Booking',
  },
  {
    id: '3',
    question: 'What payment methods are accepted?',
    answer: 'We accept major credit/debit cards, digital wallets, and in some regions, cash payments. You can manage your payment methods in the Payment Settings section.',
    category: 'Payment',
  },
  {
    id: '4',
    question: 'How do I contact my driver?',
    answer: 'Once your ride is confirmed, you can contact your driver through the in-app messaging feature or by tapping the call button on the ride details screen.',
    category: 'During Ride',
  },
  {
    id: '5',
    question: 'What if I left an item in the vehicle?',
    answer: 'Go to your trip history, select the relevant trip, and tap "I lost something". You can then contact the driver directly or file a lost item report through support.',
    category: 'After Ride',
  },
  {
    id: '6',
    question: 'How do I report a safety concern?',
    answer: 'You can report safety concerns through the Support Tickets section. For emergencies, please contact local emergency services directly. We take all safety reports seriously.',
    category: 'Safety',
  },
];

export default function HelpView() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const handleTicketSuccess = () => {
    setTicketSubmitted(true);
    setTimeout(() => setTicketSubmitted(false), 5000);
  };

  const filteredFaqs = FAQ_ITEMS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(FAQ_ITEMS.map((faq) => faq.category))];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Help & Support</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">
          Get help with your account or contact support
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search for help..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
        />
      </div>

      {/* Success Toast */}
      {ticketSubmitted && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Support ticket submitted successfully!</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setShowTicketModal(true)}
        >
          <div className="flex flex-col items-center text-center py-2">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-2">
              <MessageCircle size={24} className="text-blue-600" />
            </div>
            <p className="font-medium dark:text-white">Contact Support</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Create a ticket</p>
          </div>
        </Card>

        <a href="tel:+18007379866" className="block">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors h-full">
            <div className="flex flex-col items-center text-center py-2">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                <Phone size={24} className="text-green-600" />
              </div>
              <p className="font-medium dark:text-white">Call Us</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">1-800-SERYVO</p>
            </div>
          </Card>
        </a>

        <a href="mailto:support@seryvo.com" className="block">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors h-full">
            <div className="flex flex-col items-center text-center py-2">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-2">
                <Mail size={24} className="text-purple-600" />
              </div>
              <p className="font-medium dark:text-white">Email</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">support@seryvo.com</p>
            </div>
          </Card>
        </a>
      </div>

      {/* My Tickets Section */}
      <MyTicketsList />

      {/* FAQ Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <HelpCircle size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold dark:text-white">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Quick answers to common questions</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 dark:border-slate-700 pt-4">
          {filteredFaqs.length === 0 ? (
            <p className="text-center py-4 text-gray-500 dark:text-slate-400">
              No results found for "{search}"
            </p>
          ) : (
            filteredFaqs.map((faq) => (
              <div key={faq.id} className="border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                      {faq.category}
                    </span>
                    <span className="font-medium dark:text-white">{faq.question}</span>
                  </div>
                  {expandedFaq === faq.id ? (
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === faq.id && (
                  <div className="px-3 pb-3 text-sm text-gray-600 dark:text-slate-300 border-t border-gray-100 dark:border-slate-700 pt-2">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Legal Links */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700">
            <FileText size={20} className="text-gray-600 dark:text-slate-300" />
          </div>
          <div>
            <h2 className="font-semibold dark:text-white">Legal & Policies</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Terms and conditions</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 dark:border-slate-700 pt-4">
          <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg px-2 -mx-2">
            <span className="dark:text-white">Terms of Service</span>
            <ExternalLink size={16} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg px-2 -mx-2">
            <span className="dark:text-white">Privacy Policy</span>
            <ExternalLink size={16} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg px-2 -mx-2">
            <span className="dark:text-white">Cancellation Policy</span>
            <ExternalLink size={16} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg px-2 -mx-2">
            <span className="dark:text-white">Safety Guidelines</span>
            <ExternalLink size={16} className="text-gray-400" />
          </button>
        </div>
      </Card>

      {/* App Info */}
      <div className="text-center text-xs text-gray-400 dark:text-slate-500 space-y-1">
        <p>Seryvo Transport Platform v1.0.0</p>
        <p>© 2024 Seryvo. All rights reserved.</p>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        onSuccess={handleTicketSuccess}
      />
    </div>
  );
}
