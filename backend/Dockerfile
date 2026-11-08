# Dockerfile delegating to SnapRoom Maven project
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

WORKDIR /app

COPY SnapRoom/SnapRoom/pom.xml .
RUN mvn dependency:go-offline -B

COPY SnapRoom/SnapRoom/src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S snaproom && adduser -S snaproom -G snaproom
USER snaproom

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]

