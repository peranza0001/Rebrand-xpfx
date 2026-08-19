#!/bin/bash
set -e
npm ci --no-audit --no-fund
npm --workspace=lib/db run push
