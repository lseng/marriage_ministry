import { useState } from 'react';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Modal, ModalFooter } from '../ui/modal';
import { useCoachOptions } from '../../hooks/useCouples';
import { Send, Users, User, CheckCircle } from 'lucide-react';

interface DistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDistribute: (target: 'all' | 'coach', coachId?: string) => Promise<number>;
  assignmentTitle: string;
}

export function DistributeModal({ isOpen, onClose, onDistribute, assignmentTitle }: DistributeModalProps) {
  const { coaches, loading: loadingCoaches } = useCoachOptions();
  const [target, setTarget] = useState<'all' | 'coach'>('all');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDistribute = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const count = await onDistribute(target, target === 'coach' ? selectedCoach : undefined);
      setResult(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to distribute assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setTarget('all');
    setSelectedCoach('');
    onClose();
  };

  const coachOptions = coaches.map(c => ({ value: c.id, label: c.name }));

  if (result !== null) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Distribution Complete"
        size="sm"
      >
        <div className="text-center py-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium">
            {result === 0
              ? 'No new couples to distribute to'
              : `Successfully sent to ${result} couple${result !== 1 ? 's' : ''}`}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {assignmentTitle}
          </p>
        </div>
        <ModalFooter>
          <Button onClick={handleClose} className="w-full">Done</Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Distribute Assignment"
      description={`Send "${assignmentTitle}" to couples`}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium">Send to:</label>

          <button
            type="button"
            onClick={() => setTarget('all')}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
              target === 'all'
                ? 'border-primary bg-primary/5'
                : 'border-input hover:bg-muted'
            }`}
          >
            <Users className={`h-5 w-5 ${target === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-left">
              <p className="font-medium">All Active Couples</p>
              <p className="text-sm text-muted-foreground">
                Send to every couple with active status
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTarget('coach')}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
              target === 'coach'
                ? 'border-primary bg-primary/5'
                : 'border-input hover:bg-muted'
            }`}
          >
            <User className={`h-5 w-5 ${target === 'coach' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-left">
              <p className="font-medium">Specific Coach's Couples</p>
              <p className="text-sm text-muted-foreground">
                Send only to couples assigned to a specific coach
              </p>
            </div>
          </button>
        </div>

        {target === 'coach' && (
          <Select
            label="Select Coach"
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            options={coachOptions}
            placeholder="Choose a coach..."
            disabled={loadingCoaches}
          />
        )}
      </div>

      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDistribute}
          disabled={submitting || (target === 'coach' && !selectedCoach)}
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Sending...' : 'Send Assignment'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
