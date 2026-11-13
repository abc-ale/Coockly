FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Flags pensados para el plan gratis de Render (512 MB): arranque más rápido y menos memoria.
ENTRYPOINT ["java", "-XX:TieredStopAtLevel=1", "-XX:+UseSerialGC", "-XX:MaxRAMPercentage=75", "-Xss512k", "-jar", "/app/app.jar"]