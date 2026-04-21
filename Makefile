# HaugScore dev helpers.
# Use PowerShell so the same commands work across Windows + *nix-ish shells.
SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command
.ONESHELL:

PORT ?= 3001

.PHONY: help dev start restart kill client install

help:
	@Write-Host "Targets:"
	@Write-Host "  make dev      - start server with nodemon (auto-restart on file change)"
	@Write-Host "  make start    - start server once (no auto-restart)"
	@Write-Host "  make restart  - kill anything on port $(PORT), then start dev"
	@Write-Host "  make kill     - free port $(PORT)"
	@Write-Host "  make client   - start vite dev server for the client"
	@Write-Host "  make install  - npm install in both server and client"

kill:
	@$$p = Get-NetTCPConnection -LocalPort $(PORT) -State Listen -ErrorAction SilentlyContinue; `
	 if ($$p) { `
	   $$p | ForEach-Object { Write-Host "Killing PID $$($$_.OwningProcess) on :$(PORT)"; Stop-Process -Id $$_.OwningProcess -Force } `
	 } else { Write-Host "Port $(PORT) is already free." }

dev:
	cd server; npm run dev

start:
	cd server; npm start

restart: kill
	cd server; npm run dev

client:
	cd client; npm run dev

install:
	cd server; npm install; cd ..; cd client; npm install
