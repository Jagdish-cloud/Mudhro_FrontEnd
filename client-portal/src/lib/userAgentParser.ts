/**
 * User-Agent Parser Utility
 * Parses User-Agent strings to extract readable browser and OS information
 */

export interface ParsedUserAgent {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  device: string;
  raw: string;
}

/**
 * Parse a User-Agent string to extract browser and OS information
 */
export const parseUserAgent = (userAgent: string | null | undefined): ParsedUserAgent => {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      raw: '',
    };
  }

  const ua = userAgent.toLowerCase();
  
  // Detect browser
  let browser = 'Unknown';
  let browserVersion: string | undefined;
  
  // Brave detection (Brave sometimes includes "brave" in the string, but often mimics Chrome)
  if (ua.includes('brave')) {
    browser = 'Brave';
    const braveMatch = userAgent.match(/brave[\/\s](\d+\.\d+\.\d+\.\d+)/i);
    if (braveMatch) {
      browserVersion = braveMatch[1];
    }
  } else if (ua.includes('edg/') || ua.includes('edgios/')) {
    browser = 'Microsoft Edge';
    const edgeMatch = userAgent.match(/edg[\/\s](\d+\.\d+\.\d+\.\d+)/i);
    if (edgeMatch) {
      browserVersion = edgeMatch[1];
    }
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Google Chrome';
    const chromeMatch = userAgent.match(/chrome[\/\s](\d+\.\d+\.\d+\.\d+)/i);
    if (chromeMatch) {
      browserVersion = chromeMatch[1];
    }
  } else if (ua.includes('firefox/')) {
    browser = 'Mozilla Firefox';
    const firefoxMatch = userAgent.match(/firefox[\/\s](\d+\.\d+)/i);
    if (firefoxMatch) {
      browserVersion = firefoxMatch[1];
    }
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
    const safariMatch = userAgent.match(/version[\/\s](\d+\.\d+)/i);
    if (safariMatch) {
      browserVersion = safariMatch[1];
    }
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera';
    const operaMatch = userAgent.match(/(?:opera|opr)[\/\s](\d+\.\d+)/i);
    if (operaMatch) {
      browserVersion = operaMatch[1];
    }
  }

  // Detect operating system
  let os = 'Unknown';
  let osVersion: string | undefined;
  
  if (ua.includes('windows nt 10.0') || ua.includes('windows 10')) {
    os = 'Windows';
    osVersion = '10';
  } else if (ua.includes('windows nt 11.0') || ua.includes('windows 11')) {
    os = 'Windows';
    osVersion = '11';
  } else if (ua.includes('windows nt 6.3')) {
    os = 'Windows';
    osVersion = '8.1';
  } else if (ua.includes('windows nt 6.2')) {
    os = 'Windows';
    osVersion = '8';
  } else if (ua.includes('windows nt 6.1')) {
    os = 'Windows';
    osVersion = '7';
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    os = 'macOS';
    const macMatch = userAgent.match(/mac os x[_\s](\d+)[._](\d+)/i);
    if (macMatch) {
      osVersion = `${macMatch[1]}.${macMatch[2]}`;
    }
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
    const androidMatch = userAgent.match(/android[\/\s](\d+\.\d+)/i);
    if (androidMatch) {
      osVersion = androidMatch[1];
    }
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
    const iosMatch = userAgent.match(/os[_\s](\d+)[._](\d+)/i);
    if (iosMatch) {
      osVersion = `${iosMatch[1]}.${iosMatch[2]}`;
    }
  }

  // Detect device type
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    raw: userAgent,
  };
};

/**
 * Format User-Agent for display
 */
export const formatUserAgent = (userAgent: string | null | undefined): string => {
  const parsed = parseUserAgent(userAgent);
  
  const parts: string[] = [];
  
  if (parsed.browser !== 'Unknown') {
    const browserStr = parsed.browserVersion 
      ? `${parsed.browser} ${parsed.browserVersion}`
      : parsed.browser;
    parts.push(browserStr);
  }
  
  if (parsed.os !== 'Unknown') {
    const osStr = parsed.osVersion 
      ? `${parsed.os} ${parsed.osVersion}`
      : parsed.os;
    parts.push(osStr);
  }
  
  if (parsed.device !== 'Desktop') {
    parts.push(parsed.device);
  }
  
  return parts.length > 0 ? parts.join(' • ') : parsed.raw || 'Unknown';
};

