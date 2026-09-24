# DNS Records for morigrid.com — Stalwart Mail Server

## VPS Information
- **IPv4**: `106.215.152.234`
- **IPv6**: `2401:4900:8fc6:bba3:e815:7973:4029:5a62`
- **Mail Hostname**: `mail.morigrid.com`
- **DNS Provider**: Cloudflare

## Required DNS Records

### A Record (Critical)
```
Type: A
Name: mail
Content: 106.215.152.234
Proxy: DNS only (grey cloud)
TTL: Auto
```

### MX Record (Critical)
```
Type: MX
Name: (root)
Content: mail.morigrid.com
Priority: 10
Proxy: DNS only
TTL: Auto
```

**Note**: Remove existing Hostinger MX records (`mx1.hostinger.com`, `mx2.hostinger.com`) after migration.

### SPF Record (Critical)
```
Type: TXT
Name: (root)
Content: v=spf1 mx a -all
Proxy: DNS only
TTL: Auto
```

**Note**: Replace existing Hostinger SPF (`v=spf1 include:_spf.mail.hostinger.com ~all`).

### DKIM Records (Critical)
```
Type: TXT
Name: v1-ed25519-20260906._domainkey
Content: v=DKIM1; k=ed25519; h=sha256; p=jJ42+V+H3m1DOuPfpv+W/of1EwCyZrrGvtlQmmED0yQ=
Proxy: DNS only
TTL: Auto
```

```
Type: TXT
Name: v1-rsa-20260906._domainkey
Content: v=DKIM1; k=rsa; h=sha256; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0yDn+6NjtBvLrw/knNtXtyQUYaK1Qc6OGFe3D6RsZHzXZT8qvDWuJ66qnAzD9h+joNtwgz93EeXovSiE0LdBgFTo7CPxjS/5WEgBTAbFtdnkpjNelITDUVVlGhdVX43YyIYbgL4zSJDrpf1FlwoK7GK5IgrW+tBbuj2R/3FCSMgwIlq133/SSRoVUaK3Lt9UCVKgV1EVQyelkLb3l9HeW7tEduAwb49MWoJgIuQ9PiZ8i9GjRRQkoiuycs56hVHYbRrNzjmTzy/Qv3GAEbKOATklGDABX3rqMdqT6Cl4+mJne7KrAC8823ILP+EZzC9aMxl/9YeOzDUQYJqverq7GwIDAQAB
Proxy: DNS only
TTL: Auto
```

### DMARC Record (Critical)
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:postmaster@morigrid.com
Proxy: DNS only
TTL: Auto
```

**Note**: Start with `p=none` for monitoring. Change to `p=quarantine` or `p=reject` after verifying delivery.

### TLS Report (Optional but Recommended)
```
Type: TXT
Name: _smtp._tls
Content: v=TLSRPTv1; rua=mailto:postmaster@morigrid.com
Proxy: DNS only
TTL: Auto
```

### MTA-STS (Optional)
```
Type: TXT
Name: _mta-sts
Content: v=STSv1; id=3898908383893426391
Proxy: DNS only
TTL: Auto
```

### Autoconfig/Autodiscover (Optional — Email Client Auto-Setup)
```
Type: CNAME
Name: autoconfig
Content: mail.morigrid.com
Proxy: DNS only
TTL: Auto
```

```
Type: CNAME
Name: autodiscover
Content: mail.morigrid.com
Proxy: DNS only
TTL: Auto
```

## Records to REMOVE (Hostinger)
- `mx1.hostinger.com` (MX, priority 5)
- `mx2.hostinger.com` (MX, priority 10)
- `v=spf1 include:_spf.mail.hostinger.com ~all` (TXT)
- `_dmarc.morigrid.com` with `v=DMARC1; p=none` (TXT)

## Migration Order
1. Add `mail.morigrid.com` A record first
2. Verify it resolves: `dig +short mail.morigrid.com A @8.8.8.8`
3. Add MX, SPF, DKIM, DMARC records
4. Wait for DNS propagation (5-30 minutes with Cloudflare)
5. Remove Hostinger records
6. Verify: `dig +short morigrid.com MX @8.8.8.8` → should show `mail.morigrid.com`
7. Test outbound email
8. Test inbound email (may need to change DMARC to `p=reject` after verification)

## TLS Certificate

Port 80 is occupied by other services on the VPS. Options:
1. **Cloudflare Origin Certificate** (recommended) — Generate in Cloudflare dashboard, install on Stalwart
2. **Manual Let's Encrypt** — Use DNS-01 challenge with Cloudflare API
3. **Self-signed** — Works for internal SMTP but not for external client trust

For SMTP submission (465/587), a valid TLS certificate is needed for client trust but NOT strictly required for email delivery (MX uses STARTTLS opportunistic).

For IMAP/POP3/JMAP clients, a valid TLS certificate IS required.
