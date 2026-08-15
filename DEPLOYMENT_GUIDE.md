# 🚀 Multi-Platform Deployment & IaC Guide

**XpressPro FX Hybrid Forex Broker**  
**Date**: 2026-08-15  
**Status**: Production Ready

---

## 1. Railway Deployment (Recommended)

### Quickest Path to Production

Railway is the recommended platform because it handles everything in one place: compute, database, cache, and automatic deployments.

### Prerequisites

```bash
# 1. Install Railway CLI
npm install -g railway

# 2. Create Railway account
# Visit: https://railway.app

# 3. Initialize project
railway init

# 4. Link to existing project
railway link rebrand-xpfx-production-1988
```

### Environment Setup

```bash
# 1. Set environment variables
railway env:add DATABASE_URL postgresql://user:password@host/db
railway env:add SESSION_SECRET $(openssl rand -base64 32)
railway env:add ADMIN_USERNAME admin
railway env:add ADMIN_PASSWORD $(openssl rand -base64 12)
railway env:add NODE_ENV production

# 2. View all variables
railway env:list

# 3. Edit specific variable
railway env:edit DATABASE_URL
```

### Deployment Process

```bash
# 1. Deploy from git
git push origin main
# Railway auto-deploys via webhook

# 2. Or manual deploy
railway up

# 3. Monitor deployment
railway logs -f

# 4. Check status
railway status

# 5. Rollback to previous version
railway deploy <previous-build-id>
```

### Scaling on Railway

```bash
# View current resources
railway env

# Scale to more instances
railway scale web=3

# Increase instance size
railway env:set DYNO_TYPE=standard-2x

# Monitor scaling
railway logs | grep -i "scaling"
```

### Costs on Railway

| Component | Size | Monthly Cost |
|-----------|------|--------------|
| API Server | 1x Basic | $7 |
| PostgreSQL | 16 GB | $15 |
| Redis | 256 MB | $5 |
| Bandwidth | Included | Free |
| **Total** | | **~$27/month** |

Scales to: **$50-100/month** for 5-10x instances + upgrades

---

## 2. Docker Compose (Local Development)

### Local Development Environment

```bash
# 1. Start all services
docker-compose up -d

# 2. Services created
# - API: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - PgAdmin: http://localhost:5050

# 3. Verify health
docker-compose ps

# 4. View logs
docker-compose logs -f api

# 5. Stop services
docker-compose down

# 6. Full reset (remove volumes)
docker-compose down -v
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it xpressprofx-db psql -U xpressprofx -d xpressprofx

# Common queries
SELECT COUNT(*) FROM users;
SELECT * FROM sessions LIMIT 5;
\d users  # Show users table schema
```

### Redis Access

```bash
# Connect to Redis
docker exec -it xpressprofx-redis redis-cli

# Common commands
KEYS *
GET session:abc123
INFO memory
DBSIZE
FLUSHDB  # Clear database
```

---

## 3. Vercel Deployment (Frontend Only)

### Deploy Frontend to Vercel

Vercel is recommended for frontend-only deployments (API stays on Railway).

### Prerequisites

```bash
# 1. Create Vercel account
# Visit: https://vercel.com

# 2. Install Vercel CLI
npm install -g vercel

# 3. Link project
vercel link
```

### Configuration

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build --workspace=artifacts/nextrade",
  "outputDirectory": "artifacts/nextrade/dist/public",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://rebrand-xpfx-production-1988.up.railway.app/api/:path*"
    }
  ],
  "env": {
    "VITE_API_URL": "@vite_api_url"
  },
  "envContent": "Set VITE_API_URL to your API endpoint"
}
```

### Deployment

```bash
# 1. Deploy from CLI
vercel --prod

# 2. Or push to GitHub and enable auto-deploy
# → Vercel dashboard → Connect Git

# 3. View deployments
vercel list

# 4. Rollback
vercel rollback
```

---

## 4. Docker Hub + Self-Hosted

### Push to Docker Hub

```bash
# 1. Build Docker image
docker build -f infrastructure/docker/Dockerfile -t yourusername/xpfx:latest .

# 2. Tag image
docker tag yourusername/xpfx:latest yourusername/xpfx:v1.0.0

# 3. Login to Docker Hub
docker login

# 4. Push
docker push yourusername/xpfx:latest
docker push yourusername/xpfx:v1.0.0

# 5. Verify
docker pull yourusername/xpfx:latest
```

### Deploy to Your Server

```bash
# 1. On your server
docker pull yourusername/xpfx:latest

# 2. Run container
docker run -d \
  --name xpfx-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  yourusername/xpfx:latest

# 3. Check logs
docker logs -f xpfx-api

# 4. Stop/restart
docker stop xpfx-api
docker restart xpfx-api
```

---

## 5. Kubernetes Deployment (Enterprise)

### Kubernetes Manifests

Create `infrastructure/k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xpfx-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: xpfx-api
  template:
    metadata:
      labels:
        app: xpfx-api
    spec:
      containers:
      - name: api
        image: yourusername/xpfx:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: xpfx-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: xpfx-api-service
  namespace: production
spec:
  selector:
    app: xpfx-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
# 1. Create secrets
kubectl create secret generic xpfx-secrets \
  --from-literal=database-url=postgresql://... \
  -n production

# 2. Apply manifests
kubectl apply -f infrastructure/k8s/deployment.yaml

# 3. Check deployment
kubectl get deployments -n production
kubectl get pods -n production
kubectl logs -f deployment/xpfx-api -n production

# 4. Scale
kubectl scale deployment xpfx-api --replicas=5 -n production

# 5. Rollback
kubectl rollout undo deployment/xpfx-api -n production
```

---

## 6. AWS Elastic Beanstalk

### Create Application

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize
eb init -p "Node.js 20" xpfx

# 3. Create environment
eb create xpfx-production

# 4. Deploy
eb deploy

# 5. Monitor
eb logs
eb status
eb ssh
```

### Configuration (.ebextensions/app.config)

```yaml
option_settings:
  aws:autoscaling:asg:
    MaxSize: 10
    MinSize: 2
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "node artifacts/api-server/dist/index.mjs"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 3000
```

### Costs on AWS EB

| Component | Size | Monthly Cost |
|-----------|------|--------------|
| EC2 instances | 2x t3.small | $30 |
| RDS PostgreSQL | db.t3.micro | $25 |
| ElastiCache Redis | cache.t3.micro | $20 |
| Data transfer | 100GB/month | $10 |
| **Total** | | **~$85/month** |

---

## 7. Google Cloud Run

### Deploy to Cloud Run

```bash
# 1. Set up Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Build Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/xpfx

# 3. Deploy to Cloud Run
gcloud run deploy xpfx \
  --image gcr.io/YOUR_PROJECT_ID/xpfx \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=postgresql://...

# 4. View logs
gcloud run logs read xpfx --limit 100

# 5. Monitor traffic
gcloud run describe xpfx
```

### Costs on Google Cloud Run

| Component | Usage | Monthly Cost |
|-----------|-------|--------------|
| Cloud Run | 1M requests/month | Free tier |
| Cloud SQL | PostgreSQL | $50-100 |
| Redis (Memorystore) | 256MB | $10 |
| Network egress | 100GB | $15 |
| **Total** | | **$75-125/month** |

---

## 8. Infrastructure as Code (Terraform)

### Terraform Configuration

Create `infrastructure/terraform/main.tf`:

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier     = "xpfx-postgres"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"
  
  allocated_storage    = 20
  storage_encrypted    = true
  multi_az            = true
  
  db_name  = "xpfx"
  username = var.db_username
  password = var.db_password
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "xpfx-postgres-backup-${formatdate("YYYY-MM-DD", timestamp())}"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "xpfx-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
}

# EC2 Instance
resource "aws_instance" "api" {
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = "t3.small"
  
  tags = {
    Name = "xpfx-api"
  }
  
  user_data = file("${path.module}/user-data.sh")
}

# Output
output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
```

Create `infrastructure/terraform/variables.tf`:

```hcl
variable "aws_region" {
  default = "us-east-1"
}

variable "db_username" {
  sensitive = true
  default   = "xpfx"
}

variable "db_password" {
  sensitive = true
}
```

### Terraform Commands

```bash
# 1. Initialize
terraform init

# 2. Plan
terraform plan -out=tfplan

# 3. Apply
terraform apply tfplan

# 4. Destroy (cleanup)
terraform destroy

# 5. View state
terraform show
terraform state list
```

---

## 9. Deployment Comparison

| Platform | Setup Time | Costs (Basic) | Scaling | Best For |
|----------|-----------|---------------|---------|----------|
| **Railway** | 5 min | $27/mo | Automatic | MVP, Startups |
| **Vercel (Frontend)** | 2 min | Free tier | Built-in | Static frontend |
| **Docker Compose** | 10 min | $0 | Manual | Local dev |
| **AWS EB** | 20 min | $85/mo | Auto scaling | Enterprise |
| **Google Cloud Run** | 15 min | $0 (tier) | Auto-scaling | Serverless |
| **Kubernetes** | 1 hour | $100+/mo | Full control | Microservices |

### Recommendation

1. **MVP/Startup**: Railway ✅ (current setup)
2. **Production Ready**: Railway + Vercel (frontend)
3. **Enterprise**: Kubernetes or AWS EB
4. **Global Scale**: Multi-region on AWS/Google Cloud

---

## 10. Monitoring & Observability

### Datadog Integration

```bash
# 1. Install Datadog agent in Docker
docker run -d --name datadog-agent \
  -e DD_API_KEY=<YOUR_API_KEY> \
  -v /var/run/docker.sock:/var/run/docker.sock \
  datadog/agent:latest

# 2. Add to docker-compose.yml
services:
  datadog:
    image: datadog/agent:latest
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_APM_ENABLED=true
      - DD_LOGS_ENABLED=true
    ports:
      - "8126:8126/udp"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### Prometheus + Grafana

```bash
# 1. Add Prometheus scrape config
scrape_configs:
  - job_name: 'xpfx-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

# 2. Add Grafana dashboard
# Import: https://grafana.com/api/dashboards/1860
```

---

## 11. Backup & Recovery Strategy

### Automated Backups

```bash
# Railway: Automatic daily backups (30-day retention)

# AWS RDS: Automated snapshots
aws rds create-db-snapshot \
  --db-instance-identifier xpfx-postgres \
  --db-snapshot-identifier xpfx-backup-$(date +%Y%m%d)

# Manual backup to S3
pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://xpfx-backups/backup-$(date +%Y%m%d).sql.gz
```

### Recovery Process

```bash
# 1. Stop API servers
railway restart  # Will auto-restart

# 2. Restore database
# Railway: Via dashboard → Restore from backup
# AWS RDS: aws rds restore-db-instance-from-db-snapshot ...

# 3. Run migrations
npx prisma migrate deploy

# 4. Verify
curl https://rebrand-xpfx-production-1988.up.railway.app/healthz
```

---

## 12. Production Checklist

### Pre-Deployment

- [ ] Code reviewed and tested
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Backups created
- [ ] Security audit passed
- [ ] Performance tested
- [ ] DNS configured
- [ ] SSL certificate valid

### Post-Deployment

- [ ] Health checks passing
- [ ] Error rate <0.1%
- [ ] Response time <200ms
- [ ] Database connection working
- [ ] Logs monitoring active
- [ ] Alerts configured
- [ ] Team notified
- [ ] Incident response plan ready

---

## Quick Reference Commands

```bash
# Railway
railway up                         # Deploy
railway logs -f                    # View logs
railway env:add KEY VALUE         # Set variable
railway scale web=3               # Scale

# Docker
docker-compose up -d              # Start
docker-compose logs -f            # View logs
docker-compose down               # Stop

# Database
npx prisma studio               # View data
npx prisma migrate dev          # Create migration
npx prisma migrate deploy       # Apply migrations

# Git
git push origin main            # Deploy (auto-deploy enabled)
git revert <commit>             # Rollback
```

---

**Last Updated**: 2026-08-15  
**Status**: Production Ready  
**Support**: See INFRASTRUCTURE_GUIDE.md
