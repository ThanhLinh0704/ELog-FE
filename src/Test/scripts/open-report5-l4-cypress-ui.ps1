param(
    [switch]$SkipBootstrap,
    [switch]$NoStartServers
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoPath([string]$relativePath) {
    return [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $relativePath))
}

function Test-HttpReady([string]$url) {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        if ($_.Exception.Response) { return $true }
        return $false
    }
}

function Wait-HttpReady([string]$name, [string]$url, [int]$timeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpReady $url) {
            Write-Host "$name is ready at $url"
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$name did not become ready at $url within $timeoutSeconds seconds."
}

$workspaceRoot = Resolve-RepoPath '..\..\..\..'
$backendRoot = Join-Path $workspaceRoot 'ELog-BE'
$frontendRoot = Join-Path $workspaceRoot 'ELog-FE'
$testRoot = Join-Path $frontendRoot 'src\Test'
$l4EvidenceDir = Join-Path $frontendRoot 'test-execution\evidence\l4'
$l3EvidencePath = Join-Path $backendRoot 'test-execution\evidence\l3-rerun-results.json'

New-Item -ItemType Directory -Force -Path $l4EvidenceDir | Out-Null

if (!$NoStartServers) {
    if (!(Test-HttpReady 'http://localhost:8080/actuator/health')) {
        Write-Host 'Starting Spring Boot backend on :8080...'
        Start-Process -FilePath 'mvn.cmd' `
            -ArgumentList @('spring-boot:run') `
            -WorkingDirectory $backendRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $l4EvidenceDir 'backend-ui.stdout.log') `
            -RedirectStandardError (Join-Path $l4EvidenceDir 'backend-ui.stderr.log') | Out-Null
    }
    Wait-HttpReady 'Backend' 'http://localhost:8080/actuator/health' 120

    if (!(Test-HttpReady 'http://localhost:5173')) {
        Write-Host 'Starting Vite frontend on :5173...'
        Start-Process -FilePath 'npm.cmd' `
            -ArgumentList @('run', 'dev', '--', '--host', '0.0.0.0') `
            -WorkingDirectory $frontendRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $l4EvidenceDir 'frontend-ui.stdout.log') `
            -RedirectStandardError (Join-Path $l4EvidenceDir 'frontend-ui.stderr.log') | Out-Null
    }
    Wait-HttpReady 'Frontend' 'http://localhost:5173' 120
} else {
    Wait-HttpReady 'Backend' 'http://localhost:8080/actuator/health' 10
    Wait-HttpReady 'Frontend' 'http://localhost:5173' 10
}

if (!$SkipBootstrap) {
    Write-Host 'Generating fresh L3 fixture evidence for L4 Cypress...'
    Push-Location $backendRoot
    try {
        $env:ELOG_BASE_URL = 'http://localhost:8080'
        $env:ELOG_TEST_USERNAME = 'admin'
        $env:ELOG_TEST_PASSWORD = 'Admin@2025'
        $env:ELOG_DRIVER_USERNAME = 'driver01'
        $env:ELOG_DRIVER_PASSWORD = 'Dev@2025'
        $env:ELOG_L3_CATALOG = (Join-Path $backendRoot 'test-execution\catalog\l3.json')
        $env:ELOG_L3_OUTPUT = $l3EvidencePath
        $env:ELOG_L3_LEDGER = (Join-Path $backendRoot 'test-execution\results\l3.json')
        node test-execution\scripts\run-l3-api.mjs
    } finally {
        Pop-Location
    }
}

if (!(Test-Path $l3EvidencePath)) {
    throw "Missing L3 fixture evidence: $l3EvidencePath"
}

Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Opening Cypress UI for Report 5 L4.'
Write-Host 'In Cypress, choose E2E Testing, then run report5-web.cy.ts.'
Write-Host ''

Push-Location $testRoot
try {
    npx cypress open `
        --e2e `
        --config 'specPattern=e2e/l4/report5-web.cy.ts' `
        --env "REPORT5_FIXTURE_EVIDENCE=$($l3EvidencePath.Replace('\', '/'))"
} finally {
    Pop-Location
}
