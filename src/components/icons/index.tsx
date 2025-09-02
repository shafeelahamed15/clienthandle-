// Apple-Style Icon Library for ClientHandle
// Using Lucide React with SF Symbols-inspired styling

import {
  Home,
  Users,
  FileText,
  MessageSquare,
  Settings,
  BarChart3,
  UserPlus,
  Send,
  TrendingUp,
  Receipt,
  DollarSign,
  Bell,
  Clock,
  CheckCircle as LucideCheckCircle,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  Building,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Star,
  Heart,
  Zap,
  Shield,
  Target,
  Briefcase,
  CreditCard,
  Smartphone,
  LogOut,
  Play,
  Pause,
  Copy,
  Reply,
  Timer,
  Paperclip,
  Info,
  X,
  XCircle
} from 'lucide-react';

import { cn } from '@/lib/utils';

// Apple-inspired icon wrapper with consistent styling
interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'error';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5', 
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

const variantClasses = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-primary',
  success: 'text-green-600',
  warning: 'text-orange-500',
  error: 'text-red-500'
};

// Create Apple-style icon components with consistent props
const createIcon = (LucideIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>) => {
  const IconComponent = ({ className, size = 'md', variant = 'default', ...props }: IconProps) => (
    <LucideIcon 
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        'stroke-2', // Apple-style stroke weight
        className
      )}
      {...props}
    />
  );
  IconComponent.displayName = LucideIcon.displayName || LucideIcon.name;
  return IconComponent;
};

// Navigation Icons
export const HomeIcon = createIcon(Home);
export const UsersIcon = createIcon(Users);
export const InvoicesIcon = createIcon(FileText);
export const MessagesIcon = createIcon(MessageSquare);
export const SettingsIcon = createIcon(Settings);

// Dashboard & Stats Icons
export const AnalyticsIcon = createIcon(BarChart3);
export const TrendingIcon = createIcon(TrendingUp);
export const RevenueIcon = createIcon(DollarSign);
export const BillingIcon = createIcon(Receipt);

// Action Icons
export const AddIcon = createIcon(Plus);
export const AddUserIcon = createIcon(UserPlus);
export const SendIcon = createIcon(Send);
export const NotificationIcon = createIcon(Bell);
export const ClockIcon = createIcon(Clock);

// Status Icons
export const SuccessIcon = createIcon(LucideCheckCircle);
export const CheckCircle = createIcon(LucideCheckCircle);
export const CheckCircleIcon = createIcon(LucideCheckCircle);
export const WarningIcon = createIcon(AlertCircle);
export const AlertCircleIcon = createIcon(AlertCircle);

// Communication Icons
export const EmailIcon = createIcon(Mail);
export const PhoneIcon = createIcon(Phone);

// Business Icons
export const CompanyIcon = createIcon(Building);
export const CalendarIcon = createIcon(Calendar);
export const BriefcaseIcon = createIcon(Briefcase);

// UI Icons
export const SearchIcon = createIcon(Search);
export const FilterIcon = createIcon(Filter);
export const MoreIcon = createIcon(MoreHorizontal);
export const EditIcon = createIcon(Edit);
export const DeleteIcon = createIcon(Trash2);
export const ViewIcon = createIcon(Eye);

// File Icons
export const DownloadIcon = createIcon(Download);
export const UploadIcon = createIcon(Upload);

// Feature Icons (for marketing)
export const StarIcon = createIcon(Star);
export const HeartIcon = createIcon(Heart);
export const ZapIcon = createIcon(Zap);
export const ShieldIcon = createIcon(Shield);
export const TargetIcon = createIcon(Target);

// Payment Icons
export const CreditCardIcon = createIcon(CreditCard);
export const PhonePayIcon = createIcon(Smartphone);

// Auth Icons
export const LogOutIcon = createIcon(LogOut);
export const SaveIcon = createIcon(LucideCheckCircle);

// Media & Control Icons
export const PlayIcon = createIcon(Play);
export const PauseIcon = createIcon(Pause);
export const CopyIcon = createIcon(Copy);
export const EyeIcon = createIcon(Eye);
export const ReplyIcon = createIcon(Reply);
export const TimerIcon = createIcon(Timer);
export const PaperclipIcon = createIcon(Paperclip);

// Additional Icons for Toast/UI
export const InfoIcon = createIcon(Info);
export const XIcon = createIcon(X);
export const XCircleIcon = createIcon(XCircle);

// Management Icons
export const ManageIcon = createIcon(Settings);

// Special composite icons for brand identity
interface LogoIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ClientHandleLogo = ({ className, size = 'md' }: LogoIconProps) => (
  <div className={cn(
    'relative rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-apple-sm',
    sizeClasses[size],
    className
  )}>
    <BriefcaseIcon 
      size="sm" 
      className="text-white drop-shadow-sm" 
    />
  </div>
);

// Utility function to get semantic icons for different contexts
export const getStatusIcon = (status: string, props?: IconProps) => {
  switch (status) {
    case 'success':
    case 'paid':
    case 'completed':
      return <SuccessIcon variant="success" {...props} />;
    case 'warning':
    case 'overdue':
    case 'pending':
      return <WarningIcon variant="warning" {...props} />;
    case 'error':
    case 'failed':
    case 'void':
      return <WarningIcon variant="error" {...props} />;
    default:
      return <ClockIcon variant="muted" {...props} />;
  }
};

export const getFeatureIcon = (feature: string, props?: IconProps) => {
  switch (feature) {
    case 'ai':
    case 'automation':
      return <ZapIcon variant="accent" {...props} />;
    case 'invoicing':
    case 'billing':
      return <BillingIcon variant="success" {...props} />;
    case 'reminders':
    case 'followups':
      return <NotificationIcon variant="warning" {...props} />;
    case 'crm':
    case 'clients':
      return <UsersIcon variant="accent" {...props} />;
    default:
      return <StarIcon {...props} />;
  }
};