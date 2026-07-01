# invoke-tokenmunch.ps1 — Unified MCP Invocation + Savings Logging
# Usage:
#   .\invoke-tokenmunch.ps1 -Type code -Path D:/src -Query "auth function"
#   .\invoke-tokenmunch.ps1 -Type docs -Path D:/docs -Question "How to deploy?"
#   .\invoke-tokenmunch.ps1 -Type data -File data.csv -Action summarize

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("code","docs","data")]
    [string]$Type,

    [string]$Path,
    [string]$Query,
    [string]$Question,
    [string]$File,
    [string]$Action = "summarize",
    [string]$Agent = "echo",
    [switch]$DryRun,
    [switch]$SkipLog
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date
$outputDir = "$env:TEMP\tokenmunch"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function Invoke-MCP {
    param([string]$Command)
    if ($DryRun) {
        Write-Host "[DRY RUN] $Command"
        return @{ output = "[dry-run] would execute: $Command" }
    }
    $result = Invoke-Expression $Command 2>&1
    $exitCode = $LASTEXITCODE
    return @{
        output   = ($result | Out-String).Trim()
        exitCode = $exitCode
        duration = [Math]::Round(((Get-Date) - $startTime).TotalMilliseconds, 0)
    }
}

function Estimate-BaselineTokens {
    param([string]$MCPOutput, [string]$Type, [int]$FileCount)
    
    $charsPerToken = switch ($Type) {
        "code" { 4 }
        "docs"  { 5 }
        "data"  { 6.67 }
    }
    $savingsFactor = switch ($Type) {
        "code" { 10 }
        "docs"  { 5 }
        "data"  { 3 }
    }
    
    $mcpChars = [Math]::Max(1, $MCPOutput.Length)
    $estimatedRawChars = $mcpChars * $savingsFactor * [Math]::Max(1, $FileCount)
    $baselineTokens = [Math]::Max(1, [Math]::Round($estimatedRawChars / $charsPerToken))
    $actualTokens = [Math]::Max(1, [Math]::Round($mcpChars / $charsPerToken))
    
    return @{
        baseline = $baselineTokens
        actual   = $actualTokens
    }
}

# ---- Build Command ----
$mcpCommand = $null
$toolName = $null
$fileCount = 1

switch ($Type) {
    "code" {
        $toolName = "jcodemunch"
        if (-not $Path) { Write-Error "Code type requires -Path"; exit 1 }
        
        # First, index the path
        $mcpCommand = "jcodemunch-mcp index `"$Path`""
    }
    "docs" {
        $toolName = "jdocmunch"
        if (-not $Path) { Write-Error "Docs type requires -Path"; exit 1 }
        
        # Index the docs folder
        $mcpCommand = "jdocmunch-mcp index-local `"$Path`""
    }
    "data" {
        $toolName = "jdatamunch"
        if (-not $File) { Write-Error "Data type requires -File"; exit 1 }
        
        switch ($Action) {
            "summarize" { $mcpCommand = "jdatamunch-mcp summarize --file `"$File`"" }
            "schema"    { $mcpCommand = "jdatamunch-mcp schema --file `"$File`"" }
            "sample"    { $mcpCommand = "jdatamunch-mcp sample --file `"$File`" --rows 50" }
            default     { $mcpCommand = "jdatamunch-mcp summarize --file `"$File`"" }
        }
    }
}

if (-not $mcpCommand) {
    Write-Error "Could not build MCP command"
    exit 1
}

Write-Host "[TokenMunch] $Type via $toolName"
Write-Host "[TokenMunch] $mcpCommand"

$mcpResult = Invoke-MCP -Command $mcpCommand
$output = $mcpResult.output

if ($mcpResult.exitCode -ne 0 -and -not $DryRun) {
    Write-Warning "MCP exited with code $($mcpResult.exitCode)"
}

# Log savings
if (-not $SkipLog -and $output) {
    $est = Estimate-BaselineTokens -MCPOutput $output -Type $Type -FileCount $fileCount
    $loggerScript = "$PSScriptRoot\mcp-savings-logger.ps1"
    
    if (Test-Path $loggerScript) {
        $taskDesc = "$Type"
        if ($Path) { $taskDesc += " $Path" }
        if ($Question) { $taskDesc += " - $Question" }
        if ($Query) { $taskDesc += " - $Query" }
        
        & $loggerScript -Agent $Agent -Tool $toolName -Task $taskDesc `
            -BaselineTokens $est.baseline -ActualTokens $est.actual
    }
}

# Return result
if (-not $DryRun) {
    Write-Host ""
    Write-Host "--- MCP Result ($($mcpResult.duration)ms) ---"
    Write-Host $output
}
