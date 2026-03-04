# --- Stage 1: Build the application ---
FROM docker.io/oven/bun:1.2-debian AS builder

# Build arguments สำหรับการ build
ARG PUBLIC_APP_BASE_PORT=3001
ARG PUBLIC_APP_BASE_PATH=/aisom
ARG API_BASE

# Set เป็น ENV ตรงนี้ด้วยเพื่อใช้ใน build stage
ENV PUBLIC_APP_BASE_PORT=$PUBLIC_APP_BASE_PORT
ENV PUBLIC_APP_BASE_PATH=$PUBLIC_APP_BASE_PATH
ENV API_BASE=$API_BASE

WORKDIR /app

# คัดลอกไฟล์ package.json และ bun.lock
COPY package.json bun.lock ./

# ติดตั้ง Git และลบ cache ของ apt
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# ติดตั้ง dependencies
RUN bun install --frozen-lockfile

# คัดลอก source code ทั้งหมด
COPY . .

# Setup i18n (merge + compile)
RUN bun run i18n:merge && \
    bun x paraglide-js compile --project ./project.inlang --outdir ./src/lib/i18n

# รันคำสั่ง Build ของ SvelteKit (ผ่าน adapter-node จะได้โฟลเดอร์ build/)
RUN bun run build

# --- Stage 2: Serve the application ---
FROM docker.io/oven/bun:1.2-debian

WORKDIR /app

# ตั้งค่า Environment Variable สำหรับ Production
ENV NODE_ENV=production
ENV PUBLIC_APP_BASE_PORT=3001
ENV PUBLIC_APP_BASE_PATH=/aisom

# ติดตั้ง dependencies ที่จำเป็น (เผื่อต้องใช้ native modules)
RUN apt-get update && apt-get install -y \
    libvips-dev \
    libfftw3-dev \
    build-essential \
    procps \
    && rm -rf /var/lib/apt/lists/*

# คัดลอก package.json (เผื่อต้องใช้คำสั่ง npm/bun scripts)
COPY --from=builder /app/package.json ./

# คัดลอกไฟล์ .env (สำคัญมากสำหรับการโหลด base path/port)
COPY --from=builder /app/.env ./

# คัดลอก Output ที่ Build แล้วจาก Stage 'builder' (SvelteKit จะอยู่ในโฟลเดอร์ build)
COPY --from=builder /app/build ./build

# คัดลอก node_modules 
COPY --from=builder /app/node_modules ./node_modules

# Expose port ที่แอปพลิเคชันจะรัน (อ้างอิงจาก .env คือ 3001)
EXPOSE 3001

# กำหนดพอร์ต
ENV PORT=3001

# คำสั่งเริ่มต้นสำหรับรันแอปพลิเคชันใน Production 
# รันผ่าน bun หรือจะรัน start script ผ่าน package.json ก็ได้
CMD ["bun", "run", "start"]
