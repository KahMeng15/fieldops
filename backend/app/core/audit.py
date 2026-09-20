from fastapi import Request
from typing import Dict, Any, Optional
import re

def is_internal_docker_ip(ip: Optional[str]) -> bool:
    """
    Checks if an IP address is a local loopback or Docker bridge network IP (172.16-31.x.x).
    """
    if not ip:
        return True
    ip = ip.strip()
    if ip in ("127.0.0.1", "localhost", "::1", "testclient"):
        return True
    # Docker default bridges: 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if ip.startswith("172."):
        parts = ip.split(".")
        if len(parts) >= 2:
            try:
                second = int(parts[1])
                if 16 <= second <= 31:
                    return True
            except ValueError:
                pass
    return False

def resolve_external_ip(request: Request) -> str:
    """
    Finds the actual external client IP by evaluating headers in order,
    bypassing internal Docker gateway and proxy bridge IPs (172.16-31.x.x).
    """
    # 1. Custom client header sent from browser
    client_ext_header = (
        request.headers.get("x-client-external-ip")
        or request.headers.get("x-real-external-ip")
    )
    if client_ext_header:
        candidate = client_ext_header.split(",")[0].strip()
        if candidate and not is_internal_docker_ip(candidate):
            return candidate

    # 2. Cloudflare / Edge proxy headers
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and not is_internal_docker_ip(cf_ip):
        return cf_ip.strip()

    true_client_ip = request.headers.get("true-client-ip")
    if true_client_ip and not is_internal_docker_ip(true_client_ip):
        return true_client_ip.strip()

    # 3. Standard Forwarded headers (iterate through chain from left to right)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ips = [x.strip() for x in forwarded.split(",") if x.strip()]
        for cand in ips:
            if not is_internal_docker_ip(cand):
                return cand

    real_ip = request.headers.get("x-real-ip")
    if real_ip and not is_internal_docker_ip(real_ip):
        return real_ip.strip()

    # 4. If all else fails, return client_ext_header if present, else client host
    if client_ext_header and client_ext_header.strip():
        return client_ext_header.strip()

    return request.client.host if request.client else "127.0.0.1"

def parse_client_info(request: Request) -> Dict[str, Any]:
    """
    Extracts security and client metadata from FastAPI Request for audit logs.
    Includes resolved external IP address, device/OS, browser, platform, and raw user agent.
    """
    user_agent_str = request.headers.get("user-agent", "") or ""
    ip_address = resolve_external_ip(request)

    ua_lower = user_agent_str.lower()
    
    # Detect Device / OS
    device = "Unknown OS"
    if "macintosh" in ua_lower or "mac os x" in ua_lower:
        match = re.search(r"mac os x ([0-9_]+)", ua_lower)
        os_ver = match.group(1).replace("_", ".") if match else ""
        device = f"macOS {os_ver}".strip()
    elif "windows nt" in ua_lower:
        if "windows nt 10.0" in ua_lower:
            device = "Windows 10/11"
        elif "windows nt 6.3" in ua_lower:
            device = "Windows 8.1"
        else:
            device = "Windows"
    elif "android" in ua_lower:
        match = re.search(r"android ([0-9.]+)", ua_lower)
        os_ver = match.group(1) if match else ""
        device = f"Android {os_ver}".strip()
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        match = re.search(r"os ([0-9_]+)", ua_lower)
        os_ver = match.group(1).replace("_", ".") if match else ""
        device = f"iOS {os_ver}".strip()
    elif "linux" in ua_lower:
        device = "Linux"

    # Detect Browser & Version
    browser = "Unknown Browser"
    if "edg/" in ua_lower:
        match = re.search(r"edg/([0-9.]+)", ua_lower)
        browser = f"Microsoft Edge {match.group(1)}" if match else "Microsoft Edge"
    elif "chrome/" in ua_lower and "chromium" not in ua_lower and "edg" not in ua_lower:
        match = re.search(r"chrome/([0-9.]+)", ua_lower)
        browser = f"Google Chrome {match.group(1)}" if match else "Google Chrome"
    elif "firefox/" in ua_lower:
        match = re.search(r"firefox/([0-9.]+)", ua_lower)
        browser = f"Mozilla Firefox {match.group(1)}" if match else "Mozilla Firefox"
    elif "safari/" in ua_lower and "chrome" not in ua_lower:
        match = re.search(r"version/([0-9.]+)", ua_lower)
        browser = f"Apple Safari {match.group(1)}" if match else "Apple Safari"
    elif "curl/" in ua_lower:
        browser = f"cURL {user_agent_str.split('/')[-1]}"
    elif "postman" in ua_lower:
        browser = "Postman Runtime"

    return {
        "ip_address": ip_address,
        "user_agent": user_agent_str,
        "device": device,
        "browser": browser,
        "sec_ch_ua_platform": (request.headers.get("sec-ch-ua-platform") or "").replace('"', '').strip(),
        "accept_language": request.headers.get("accept-language", "") or ""
    }
