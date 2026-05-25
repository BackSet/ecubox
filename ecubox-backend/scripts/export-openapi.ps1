# Exporta el spec OpenAPI desde un backend en ejecución (perfil dev).
$baseUrl = if ($env:OPENAPI_URL) { $env:OPENAPI_URL } else { "http://localhost:8080/v3/api-docs" }
$outFile = Join-Path $PSScriptRoot "..\..\docs\openapi\openapi.json"
$outDir = Split-Path $outFile -Parent

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Write-Host "Descargando OpenAPI desde $baseUrl ..."
Invoke-WebRequest -Uri $baseUrl -OutFile $outFile -UseBasicParsing
Write-Host "Guardado en $outFile"
