import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import CancellationPolicyManager from '../components/admin/CancellationPolicyManager';
import { useNavigation } from '../contexts/NavigationContext';

export default function CancellationPoliciesView() {
  const { navigateTo } = useNavigation();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigateTo('dashboard')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold">Cancellation Policies</h1>
      </div>

      <CancellationPolicyManager />
    </div>
  );
}
