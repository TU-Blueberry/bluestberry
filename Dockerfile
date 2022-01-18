FROM node:14 AS build
ARG PREFIX
RUN apt update && apt install zip

WORKDIR /app

COPY package.json .
COPY yarn.lock .
COPY postinstall.sh .
RUN yarn

COPY . .
RUN yarn build /$PREFIX/

RUN cd /app/dist/bluestberry/assets/sortierroboter; zip sortierroboter.zip *; mv sortierroboter.zip ..
RUN cd /app/dist/bluestberry/assets/experience2; zip experience2.zip *; mv experience2.zip ..

FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist/bluestberry /usr/share/nginx/html
COPY /config/nginx.conf /etc/nginx/conf.d/default.conf
