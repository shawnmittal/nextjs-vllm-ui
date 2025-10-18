# Zarf Package for Next.js vLLM UI

This directory contains the Zarf package configuration for deploying the Next.js vLLM UI application to Kubernetes.

## Prerequisites

- [Zarf CLI](https://zarf.dev/) installed
- Docker or Podman for building the container image
- Access to a Kubernetes cluster
- vLLM or Ollama API endpoint available

## Building the Zarf Package

1. **Build the Docker image first:**
   ```bash
   cd ..
   docker build -t nextjs-vllm-ui:latest .
   ```

2. **Create the Zarf package:**
   ```bash
   cd zarf
   zarf package create . --confirm
   ```

   This will create a file like `zarf-package-nextjs-vllm-ui-<arch>-1.0.0.tar.zst`

## Deploying the Package

### Basic Deployment

Deploy with default settings (connects to vLLM at http://host.docker.internal:8000):

```bash
zarf package deploy zarf-package-nextjs-vllm-ui-*.tar.zst --confirm
```

### Custom Configuration

Deploy with custom vLLM URL and other settings:

```bash
zarf package deploy zarf-package-nextjs-vllm-ui-*.tar.zst \
  --set VLLM_URL=http://vllm-service.vllm.svc.cluster.local:8000 \
  --set REPLICAS=2 \
  --confirm
```

### For Ollama

If using Ollama instead of vLLM:

```bash
zarf package deploy zarf-package-nextjs-vllm-ui-*.tar.zst \
  --set VLLM_URL=http://ollama-service:11434 \
  --set VLLM_MODEL=llama3 \
  --set VLLM_TOKEN_LIMIT=8192 \
  --confirm
```

## Configuration Variables
## Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VLLM_URL` | URL of the vLLM or Ollama API endpoint | `http://host.docker.internal:8000` |
| `VLLM_API_KEY` | API key for vLLM (optional) | `""` |
| `VLLM_TOKEN_LIMIT` | Token limit for the model | `8192` |
| `VLLM_MODEL` | Model name (required for Ollama) | `""` |
| `REPLICAS` | Number of replicas | `1` |

## Components

### Required Components

- **nextjs-vllm-ui-app**: Main application deployment including:
  - Namespace
  - Deployment
  - Service
  - ConfigMap
  - Container image

## Accessing the Application

### Via NodePort

The service is exposed as a NodePort on port 30080. Access the application at:

```
http://<node-ip>:30080
```

To get your node IP:
```bash
kubectl get nodes -o wide
```

## Removing the Package

```bash
zarf package remove nextjs-vllm-ui --confirm
```

Or manually:

```bash
kubectl delete namespace nextjs-vllm-ui
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Kubernetes Cluster            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Namespace: nextjs-vllm-ui        │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Deployment                 │ │ │
│  │  │  ┌───────────────────────┐  │ │ │
│  │  │  │  Pod                  │  │ │ │
│  │  │  │  nextjs-vllm-ui:latest│  │ │ │
│  │  │  │  Port: 3000           │  │ │ │
│  │  │  └───────────────────────┘  │ │ │
│  │  └─────────────────────────────┘ │ │
│  │              │                    │ │
│  │  ┌───────────▼─────────────────┐ │ │
│  │  │  Service (NodePort)         │ │ │
│  │  │  80 → 3000 / NodePort 30080 │ │ │
│  │  └───────────┬─────────────────┘ │ │
│  │              │                    │ │
│  │  ┌───────────▼─────────────────┐ │ │
│  │  │  External Node Access       │ │ │
│  │  │  http://<node-ip>:30080     │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  ConfigMap                  │ │ │
│  │  │  - VLLM_URL                 │ │ │
│  │  │  - VLLM_API_KEY             │ │ │
│  │  │  - VLLM_MODEL               │ │ │
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                         │
│          ▼ Connects to ▼                │
│     External vLLM/Ollama API            │
└─────────────────────────────────────────┘
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n nextjs-vllm-ui
```

### View Logs

```bash
kubectl logs -n nextjs-vllm-ui -l app=nextjs-vllm-ui -f
```

### Check ConfigMap

```bash
kubectl get configmap -n nextjs-vllm-ui nextjs-vllm-ui-config -o yaml
```

### Test vLLM Connection

From inside the pod:
```bash
kubectl exec -n nextjs-vllm-ui -it deployment/nextjs-vllm-ui -- sh
# Then inside the pod:
wget -O- $VLLM_URL/health
```

## Security Considerations

- The application runs as a non-root user (UID 1001)
- Security context drops all capabilities
- Resource limits are configured to prevent resource exhaustion

## Resource Requirements

**Default Settings:**
- Requests: 256Mi memory, 100m CPU
- Limits: 512Mi memory, 500m CPU

These can be adjusted in `manifests/deployment.yaml` as needed.
