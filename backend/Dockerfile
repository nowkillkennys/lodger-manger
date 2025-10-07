FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN apk add --no-cache curl postgresql-client
COPY . .
RUN mkdir -p uploads backups
RUN chmod +x entrypoint.sh
EXPOSE 3003
ENTRYPOINT ["./entrypoint.sh"]