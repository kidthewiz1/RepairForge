#!/bin/bash
# Write a permissive OpenSSL config to fix TLS cipher suite issues with MongoDB Atlas on Render
cat > /tmp/openssl_rf.cnf << 'EOF'
[openssl_init]
ssl_conf = ssl_sect

[ssl_sect]
system_default = system_default_sect

[system_default_sect]
CipherString = DEFAULT@SECLEVEL=1
MinProtocol = TLSv1.2
EOF

export OPENSSL_CONF=/tmp/openssl_rf.cnf
exec uvicorn server:app --host 0.0.0.0 --port "$PORT"
