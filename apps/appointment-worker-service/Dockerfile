FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY src/*.csproj ./src/
RUN cd src && dotnet restore

# Copy everything else and build app
COPY src/. ./src/
WORKDIR /app/src
RUN dotnet publish -c Release -o /app/out

# Final stage/image
FROM mcr.microsoft.com/dotnet/runtime:8.0
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "AppointmentWorkerService.dll"]
