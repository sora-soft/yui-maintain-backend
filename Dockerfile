# First stage: compile typescript code
FROM node:18.12-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY package.json /app
COPY package-lock.json /app

RUN npm install

COPY bin /app/bin
COPY tsconfig.json /app
COPY sora.json /app
COPY src /app/src

RUN npm run build

RUN rm -r /app/src

# Second stage: minimal runtime environment
FROM node:18.12-alpine

RUN apk add tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo "Asia/Shanghai" > /etc/timezone && apk del tzdata

WORKDIR /app

COPY --from=builder /app /app

RUN npm config set unsafe-perm true && npm install -g /app

VOLUME ["/run/app/", "/var/log/app/", "/etc/app/"]

CMD ["app-server", "run", "server", "--config", "/etc/app/config.yml", "-w", "/run/app"]
