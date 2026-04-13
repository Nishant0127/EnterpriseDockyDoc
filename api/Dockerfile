FROM node:22-alpine

WORKDIR /app

# Install all dependencies (including devDeps needed for build: @nestjs/cli, @swc/core, prisma)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build && npx prisma generate

# Drop devDependencies after build to keep image lean
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 10000

# Apply pending migrations then start the compiled app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
