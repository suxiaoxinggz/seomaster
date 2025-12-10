# Build Stage
FROM node:20-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
# Use strict peer deps false in case of conflicts, or legacy peer deps
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine
# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
