FROM node:20-alpine AS build

WORKDIR /app

# Embutidas no bundle web no build (são públicas: URL do projeto e chave anon/publishable).
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

ENV CI=1 \
    EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN test -n "$EXPO_PUBLIC_SUPABASE_URL" && test -n "$EXPO_PUBLIC_SUPABASE_ANON_KEY" \
    || (echo 'Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (build args).' && exit 1)
RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine AS runtime

RUN printf '%s\n' \
  'server {' \
  '    listen 80;' \
  '    listen [::]:80;' \
  '    server_name _;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html;' \
  '    location /_expo/static/ {' \
  '        try_files $uri =404;' \
  '        expires 1y;' \
  '        add_header Cache-Control "public, immutable";' \
  '    }' \
  '    location / {' \
  '        try_files $uri $uri.html $uri/ /index.html;' \
  '    }' \
  '    location = /health {' \
  '        access_log off;' \
  '        add_header Content-Type text/plain;' \
  '        return 200 "ok\n";' \
  '    }' \
  '}' \
  > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
