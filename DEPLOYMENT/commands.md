# Deployment commands

## Local
npm install
cp DEPLOYMENT/LOCAL_ENV_TEMPLATE.env .env
npm run build
PORT=3000 SESSION_SECRET=replace-me JWT_SECRET=replace-me WALLET_ENCRYPTION_KEY=replace-me NODE_ENV=development ENABLE_DEMO_AUTH=true node artifacts/api-server/dist/index.mjs

## VPS / systemd
sudo mkdir -p /var/www/Rebrand-xpfx
sudo git clone https://github.com/peranza0001/Rebrand-xpfx.git /var/www/Rebrand-xpfx
cd /var/www/Rebrand-xpfx
cp DEPLOYMENT/LOCAL_ENV_TEMPLATE.env .env
bash start.sh

## Railway
Set the variables from DEPLOYMENT/RAILWAY_ENV.example in the Railway dashboard and deploy the repo.

## Docker Compose
cp DEPLOYMENT/LOCAL_ENV_TEMPLATE.env .env.production
docker compose up --build -d
