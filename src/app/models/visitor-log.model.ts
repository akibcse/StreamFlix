export interface VisitorLog {
  id?: string;
  timestamp: number;
  dateStr: string;
  path: string;

  // IP & Network / ISP Information
  ip: string;
  ipType?: string; // e.g. 'IPv4' | 'IPv6'
  isp?: string; // e.g. 'Extreme Net', 'Comcast Cable', 'Airtel'
  org?: string; // Organization e.g. 'Extreme Net'
  asn?: string | number; // e.g. 'AS132489'
  connectionType?: string; // e.g. '4g', 'wifi', 'ethernet'
  downlink?: string; // e.g. '10 Mbps'
  rtt?: string; // e.g. '50 ms'

  // Precise Geolocation Information
  city?: string;
  region?: string; // State / Province / Division
  country?: string;
  countryCode?: string; // e.g. 'BD', 'US'
  postal?: string; // Postal / Zip code
  latitude?: number;
  longitude?: number;
  timezone?: string; // e.g. 'Asia/Dhaka'
  timezoneOffset?: string; // e.g. '+06:00'
  flag?: string; // Flag emoji or URL

  // Device & Client Information
  device: string; // 'Desktop' | 'Mobile' | 'Tablet' | 'TV'
  deviceModel?: string; // e.g. 'iPhone 15', 'Windows 11 PC', 'MacBook Pro'
  browser: string; // e.g. 'Chrome 128'
  browserVersion?: string;
  os: string; // e.g. 'Windows 11', 'macOS Sonoma', 'iOS 17.5'
  osVersion?: string;
  screenResolution?: string; // e.g. '1920×1080'
  viewport?: string; // e.g. '1440×900'
  pixelRatio?: number; // e.g. 2
  colorDepth?: number; // e.g. 24
  orientation?: string; // 'landscape' | 'portrait'
  cpuCores?: number; // e.g. 8
  ram?: string; // e.g. '8 GB'
  language?: string; // e.g. 'en-US'
  touchSupport?: boolean;

  // User Identity & Session
  userId?: string | null;
  userEmail?: string | null;
  userAgent?: string;
  referrer?: string;
}

export interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  topPages: { path: string; count: number }[];
  recentLogs: VisitorLog[];
}
