'use client';

import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Auto-generate breadcrumbs from pathname if no items provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname);
  
  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }
  
  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600 mb-6">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        return (
          <div key={item.href} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
            )}
            {isLast ? (
              <span className="flex items-center space-x-1 font-medium text-gray-900">
                {item.icon}
                <span>{item.label}</span>
              </span>
            ) : (
              <Link 
                href={item.href}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors duration-200"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Always start with Dashboard
  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="w-4 h-4" />
  });
  
  // Map segments to breadcrumbs
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip the first segment if it's a route group like (app)
    if (segment.startsWith('(') && segment.endsWith(')')) {
      return;
    }
    
    const label = getSegmentLabel(segment);
    
    breadcrumbs.push({
      label,
      href: currentPath
    });
  });
  
  return breadcrumbs;
}

function getSegmentLabel(segment: string): string {
  const segmentMap: Record<string, string> = {
    'clients': 'Clients',
    'invoices': 'Invoices',
    'followups': 'Follow-ups',
    'settings': 'Settings',
    'dashboard': 'Dashboard',
    'create': 'Create',
    'edit': 'Edit',
    'manage': 'Manage'
  };
  
  return segmentMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}