@echo off
setlocal

rem Maven Wrapper local para Windows. Descarga Maven solo la primera vez.
set "VERSION_MAVEN=3.9.16"
set "RAIZ_PROYECTO=%~dp0"
set "DIRECTORIO_MAVEN=%RAIZ_PROYECTO%.mvn\apache-maven-%VERSION_MAVEN%"

if not exist "%DIRECTORIO_MAVEN%\bin\mvn.cmd" (
  echo Descargando Apache Maven %VERSION_MAVEN% por primera vez...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $raiz=[IO.Path]::GetFullPath('%RAIZ_PROYECTO%'); $destino=Join-Path $raiz '.mvn'; New-Item -ItemType Directory -Force -Path $destino | Out-Null; $archivo=Join-Path $destino 'apache-maven-3.9.16-bin.zip'; Invoke-WebRequest -Uri 'https://dlcdn.apache.org/maven/maven-3/3.9.16/binaries/apache-maven-3.9.16-bin.zip' -OutFile $archivo; Expand-Archive -Path $archivo -DestinationPath $destino -Force; Remove-Item -LiteralPath $archivo -Force"
  if errorlevel 1 (
    echo No se pudo descargar Maven. Verifica tu conexion a Internet.
    exit /b 1
  )
)

call "%DIRECTORIO_MAVEN%\bin\mvn.cmd" %*
exit /b %ERRORLEVEL%
