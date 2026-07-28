#!/usr/bin/env bash
set -euo pipefail
cd /var/www/Rebrand-xpfx || cd /home/your-user/Rebrand-xpfx
cp DEPLOYMENT/LOCAL_ENV_TEMPLATE.env .env
bash start.sh
