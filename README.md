# nextjs-vllm-ui

Forked from https://github.com/jakobhoeg/nextjs-ollama-llm-ui

<div align="center">
  <img src="nextjs-vllm-ui.gif">
</div>

<h1 align="center">
  Light-weight web interface for OpenAI API compatible endpoints.
</h1>

Get up and running with Large Language Models **quickly**, **locally** and even **offline**.
This project aims to be the easiest way for you to get started with OpenAI API compatible endpoints. 
This is not meant to be a secure, multi-tenant application. It's meant to be a lightweight, extensible
frontend that can be used for development and testing.

# Features

- **Fully local:** Stores chats in localstorage for convenience. No need to run a database.
- **Easy setup:** No tedious and annoying setup required. Just clone the repo and you're good to go!
- **Code syntax highligting:** Messages that include code, will be highlighted for easy access.
- **Copy codeblocks easily:** Easily copy the highlighted code with one click.
- **Chat history:** Chats are saved and easily accessed.
- **Light & Dark mode:** Switch between light & dark mode.


# Requisites

To use the web interface, these requisites must be met:

1. Download [vLLM](https://docs.vllm.ai/en/latest/) and have it running. Or use an OpenAI API compatible endpoint from [Google](https://ai.google.dev/gemini-api/docs/openai) or [OpenAI](https://openai.com).
2. [Node.js](https://nodejs.org/en/download) (18+), [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) is required.

# Usage 🚀

The easiest way to get started is to use Docker.

```
docker build -t nextjs-vllm-ui:latest

docker run --rm -d -p 3000:3000 nextjs-vllm-ui:latest
```

Then go to [localhost:3000](http://localhost:3000) and start chatting with your favourite model!


# Kubernetes Deployment with Zarf 🚢

[Zarf](https://zarf.dev/) package configuration.

## Quick Start

1. **Build the Docker image:**
   ```bash
   docker build -t nextjs-vllm-ui:latest .
   ```

2. **Create the Zarf package:**
   ```bash
   cd zarf
   zarf package create . --confirm
   ```

3. **Deploy to your cluster:**
   ```bash
   zarf package deploy zarf-package-nextjs-vllm-ui-*.tar.zst --confirm
   ```

## Configuration Options

The Zarf package supports the following configuration variables:

- `VLLM_URL`: URL of your vLLM or Ollama API endpoint (default: `http://vllm.vllm.svc.cluster.local:8000`)
- `VLLM_API_KEY`: API key for vLLM (optional)
- `VLLM_TOKEN_LIMIT`: Token limit for the model (default: `8192`)
- `VLLM_MODEL`: Model name (required for Ollama)
- `REPLICAS`: Number of application replicas (default: `1`)

**Example deployment with custom settings:**

```bash
zarf package deploy zarf-package-nextjs-vllm-ui-*.tar.zst \
  --set VLLM_URL=http://my-vllm-service:8000 \
  --set VLLM_MODEL=gemma3-27b-it \
  --set REPLICAS=2 \
  --confirm
```

For more detailed instructions, see the [Zarf README](zarf/README.md).

# Tech stack

[NextJS](https://nextjs.org/) - React Framework for the Web

[TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework

[shadcn-ui](https://ui.shadcn.com/) - UI component built using Radix UI and Tailwind CSS

[shadcn-chat](https://github.com/jakobhoeg/shadcn-chat) - Chat components for NextJS/React projects
