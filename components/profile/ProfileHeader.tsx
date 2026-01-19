import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/avatar';
import { StatusBadge, StatusType } from '../ui/badge';
import { Button } from '../ui/button';
import { ArrowLeft, Edit } from 'lucide-react';

interface ProfileHeaderProps {
  name: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  status?: StatusType;
  backTo: string;
  backLabel: string;
  onEdit?: () => void;
  showEdit?: boolean;
}

export function ProfileHeader({
  name,
  subtitle,
  email,
  phone,
  status,
  backTo,
  backLabel,
  onEdit,
  showEdit = false,
}: ProfileHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      {/* Back button */}
      <button
        onClick={() => navigate(backTo)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">{backLabel}</span>
      </button>

      {/* Profile info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <Avatar size="xl" fallback={name} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{name}</h1>
            {status && <StatusBadge status={status} />}
          </div>
          {subtitle && (
            <p className="text-muted-foreground mb-2">{subtitle}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {email && <span>{email}</span>}
            {phone && <span>{phone}</span>}
          </div>
        </div>
        {showEdit && onEdit && (
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
