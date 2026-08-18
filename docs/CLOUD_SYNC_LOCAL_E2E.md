# 云同步本地联测

完整步骤（起服、API 双设备脚本、UI 场景清单）见：

**[wuji-server/docs/CLOUD_SYNC_LOCAL_E2E.md](../../wuji-server/docs/CLOUD_SYNC_LOCAL_E2E.md)**

## 客户端快速接入本地 API

```bash
cp .env.development.example .env.development.local
# 确认 VITE_API_BASE_URL=http://localhost:3000/v1/api/
pnpm dev
```

## API 脚本（需先启动 server）

```bash
cd ../wuji-server
$env:SYNC_E2E_EMAIL="..."
$env:SYNC_E2E_PASSWORD="..."
npm run test:sync-e2e
```
