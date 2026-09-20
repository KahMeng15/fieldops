let memoryIp: string | null = null;
let isFetching = false;
const listeners: ((ip: string) => void)[] = [];

export const getExternalIpSync = (): string => {
  if (memoryIp) return memoryIp;
  try {
    const stored = localStorage.getItem('fieldops_client_external_ip');
    if (stored && !stored.startsWith('172.') && !stored.startsWith('127.')) {
      memoryIp = stored;
      return stored;
    }
  } catch {
    // ignore localStorage error
  }
  return '';
};

export const fetchExternalIp = async (): Promise<string> => {
  if (memoryIp) return memoryIp;

  const stored = getExternalIpSync();
  if (stored) return stored;

  if (isFetching) {
    return new Promise(resolve => {
      listeners.push(resolve);
    });
  }

  isFetching = true;

  const providers = [
    { url: 'https://api.ipify.org?format=json', parse: (d: any) => d.ip },
    { url: 'https://api64.ipify.org?format=json', parse: (d: any) => d.ip },
    { url: 'https://icanhazip.com', parse: (t: string) => t.trim() },
    { url: 'https://httpbin.org/ip', parse: (d: any) => d.origin?.split(',')[0]?.trim() }
  ];

  for (const p of providers) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(p.url, { 
        signal: controller.signal,
        cache: 'no-store' 
      });
      clearTimeout(timer);
      if (res.ok) {
        let ip = '';
        if (p.url.includes('format=json') || p.url.includes('httpbin')) {
          const json = await res.json();
          ip = p.parse(json);
        } else {
          const text = await res.text();
          ip = p.parse(text);
        }
        if (ip && !ip.startsWith('172.') && !ip.startsWith('127.')) {
          memoryIp = ip;
          try {
            localStorage.setItem('fieldops_client_external_ip', ip);
          } catch {}
          isFetching = false;
          listeners.forEach(fn => fn(ip));
          listeners.length = 0;
          return ip;
        }
      }
    } catch {
      // try next provider
    }
  }

  isFetching = false;
  return memoryIp || '';
};

// Immediately kick off resolution in browser
if (typeof window !== 'undefined') {
  fetchExternalIp();
}
