/**
 * Vercel Serverless Function: Accurate Client Geolocation
 * Route: /api/geo
 * Resolves the visitor's REAL public IP from the proxy headers (x-forwarded-for)
 * and performs a server-side geolocation + ISP/ASN lookup so logs are accurate.
 */

const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'StreamFlix-Geo/1.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function getClientIp(req) {
  // Vercel sends the real client IP as the first entry of x-forwarded-for
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first && first !== '::1' && first !== '127.0.0.1') return first;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && String(realIp).trim()) return String(realIp).trim();
  return req.socket?.remoteAddress || null;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1' || ip === '127.0.0.1') return true;
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^fe80:/i.test(ip) ||
    ip === 'localhost'
  );
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

module.exports = async function handler(req, res) {
  const requestedIp = (req.query && req.query.ip) ? String(req.query.ip) : null;
  const ip = requestedIp && !isPrivateIp(requestedIp) ? requestedIp : getClientIp(req);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (!ip || isPrivateIp(ip)) {
    return res.status(200).json({
      success: false,
      ip: 'Unknown IP',
      country: 'Global',
      timezone: Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
    });
  }

  // 1. ipwho.is (rich ISP & ASN data)
  const whoRes = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (whoRes && whoRes.success !== false && whoRes.ip) {
    return res.status(200).json({
      success: true,
      ip: whoRes.ip,
      ipType: whoRes.type || (whoRes.ip.includes(':') ? 'IPv6' : 'IPv4'),
      city: whoRes.city || '',
      region: whoRes.region || '',
      country: whoRes.country || '',
      countryCode: whoRes.country_code || '',
      postal: whoRes.postal || '',
      latitude: whoRes.latitude,
      longitude: whoRes.longitude,
      timezone: whoRes.timezone?.id || '',
      timezoneOffset: whoRes.timezone?.utc || '',
      isp: whoRes.connection?.isp || whoRes.connection?.org || '',
      org: whoRes.connection?.org || '',
      asn: whoRes.connection?.asn ? `AS${whoRes.connection.asn}` : '',
      flag: whoRes.flag?.emoji || getFlagEmoji(whoRes.country_code)
    });
  }

  // 2. freeipapi.com
  const freeRes = await fetchJson(`https://freeipapi.com/api/json/${encodeURIComponent(ip)}`);
  if (freeRes && freeRes.ipAddress) {
    return res.status(200).json({
      success: true,
      ip: freeRes.ipAddress,
      ipType: freeRes.ipVersion === 6 ? 'IPv6' : 'IPv4',
      city: freeRes.cityName || '',
      region: freeRes.regionName || '',
      country: freeRes.countryName || '',
      countryCode: freeRes.countryCode || '',
      postal: freeRes.zipCode || '',
      latitude: freeRes.latitude,
      longitude: freeRes.longitude,
      timezone: freeRes.timeZone || '',
      flag: getFlagEmoji(freeRes.countryCode)
    });
  }

  // 3. ipapi.co
  const ipapiRes = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (ipapiRes && ipapiRes.ip) {
    return res.status(200).json({
      success: true,
      ip: ipapiRes.ip,
      ipType: ipapiRes.version || (ipapiRes.ip.includes(':') ? 'IPv6' : 'IPv4'),
      city: ipapiRes.city || '',
      region: ipapiRes.region || '',
      country: ipapiRes.country_name || '',
      countryCode: ipapiRes.country_code || '',
      postal: ipapiRes.postal || '',
      latitude: ipapiRes.latitude,
      longitude: ipapiRes.longitude,
      timezone: ipapiRes.timezone || '',
      timezoneOffset: ipapiRes.utc_offset || '',
      isp: ipapiRes.org || '',
      org: ipapiRes.org || '',
      asn: ipapiRes.asn || '',
      flag: getFlagEmoji(ipapiRes.country_code)
    });
  }

  return res.status(200).json({
    success: true,
    ip,
    ipType: ip.includes(':') ? 'IPv6' : 'IPv4',
    country: 'Global',
    timezone: Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    flag: '🌐'
  });
};