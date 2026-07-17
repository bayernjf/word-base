import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AnnouncementSeverity } from '../../lib/announcement/types';

export function severityIcon(severity: AnnouncementSeverity) {
  if (severity === 'critical') return AlertOctagon;
  if (severity === 'warning') return AlertTriangle;
  return Info;
}
