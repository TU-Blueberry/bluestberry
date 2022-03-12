FROM node:16 AS build
ARG PREFIX
RUN apt update && apt install zip

WORKDIR /app

COPY package.json .
COPY yarn.lock .
COPY postinstall.sh .
COPY crypt .
RUN yarn

COPY . .
RUN yarn build /$PREFIX/

FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist/bluestberry /usr/share/nginx/html
COPY /config/nginx.conf /etc/nginx/conf.d/default.conf
