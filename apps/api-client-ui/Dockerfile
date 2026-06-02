FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# For a monorepo, if we just build inside the ui folder, we can copy its own package.json, 
# but it might depend on the domain files in the upper folder.
# So the context should be the whole repo or at least apps/.
# But a simple UI Dockerfile can just use what's passed in.
# For simplicity, if we run docker build from the apps/api-client-ui context, it won't see appointment-api-service.
# Let's adjust this to build from the root if necessary, or just rely on the parent build context.

# Since docker-compose typically runs from root, we expect context to be the repository root.
# But normally a Dockerfile inside the app directory runs relative to its app dir unless specified otherwise.
# We will use the root context in docker-compose.
COPY . .
WORKDIR /app/apps/api-client-ui
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/api-client-ui/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
