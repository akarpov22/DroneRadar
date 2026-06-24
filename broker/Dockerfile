FROM eclipse-mosquitto:2

USER root
RUN apk add --no-cache openssl

COPY mosquitto.prod.conf /mosquitto/config/
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 1883 8883

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
