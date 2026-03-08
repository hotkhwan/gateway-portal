# Deploy — AISOM Dev (k3s)

k3s manifest สำหรับ develop locally
Mount source code จาก `/home/aisom/gateway-portal` (host) → `/app` ใน pod

## Apply

```bash
kubectl apply -f deploy/aisom/deploy.yml
```

## Logs

```bash
kubectl logs -n gw -l app=portal-aisom -f
```

## Delete

```bash
kubectl delete -f deploy/aisom/deploy.yml
```

## URL

http://<node-ip>:3001  หรือผ่าน ingress/gateway ที่ตั้งค่าไว้
