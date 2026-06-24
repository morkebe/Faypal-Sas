# ── Stage 1 : build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URLs injectées au build (modifiables via docker-compose args)
ARG VITE_API_URL=http://localhost:8000
ARG VITE_ML_URL=http://localhost:8001
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ML_URL=$VITE_ML_URL

RUN npm run build

# ── Stage 2 : serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
