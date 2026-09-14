FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# using npm ci instead of npm install since that ruined the dep install process
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
