export interface VisitorLog {
  id?: string;
  timestamp: number;
  dateStr: string;
  path: string;
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  browser: string;
  os: string;
  device: string;
  userId?: string | null;
  userEmail?: string | null;
}

export interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  topPages: { path: string; count: number }[];
  recentLogs: VisitorLog[];
}
