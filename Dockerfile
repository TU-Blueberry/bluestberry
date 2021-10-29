FROM node:14-alpine AS build
ARG PREFIX

WORKDIR /app

COPY package.json .
RUN yarn

COPY . .
RUN yarn build /$PREFIX/

FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist/blueberry /usr/share/nginx/html
COPY /config/nginx.conf /etc/nginx/conf.d/default.conf
