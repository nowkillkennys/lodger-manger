FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN apk add --no-cache curl
COPY . .
RUN mkdir -p uploads backups
EXPOSE 3003
CMD ["npm", "start"]