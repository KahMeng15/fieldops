FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /var/www/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
