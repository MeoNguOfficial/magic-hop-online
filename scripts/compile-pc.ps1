param(
    [string]$Source = "src-pc\Program.cs",
    [string]$Icon = "src-pc\app.ico",
    [string]$Output = "dist-pc\CyberBeatHopper.exe"
)

$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$srcPath = Join-Path $rootDir $Source
$iconPath = Join-Path $rootDir $Icon
$outPath = Join-Path $rootDir $Output
$outDir = Split-Path $outPath -Parent

if (-not (Test-Path $srcPath)) {
    Write-Error "Khong tim thay file nguon: $srcPath"
    exit 1
}

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# 1. Tim thu vien tham chieu .NET Framework (giu .exe nhe, chay ngay tren moi Windows khong can cai runtime roi)
$refCandidates = @(
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.8.1",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.8",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.7.2",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.7.1",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.7",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.6.2",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.6.1",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.5.2",
    "${env:ProgramFiles(x86)}\Reference Assemblies\Microsoft\Framework\.NETFramework\v4.5",
    "${env:SystemRoot}\Microsoft.NET\Framework64\v4.0.30319"
)
$refDir = $refCandidates | Where-Object { $_ -and (Test-Path (Join-Path $_ "System.Windows.Forms.dll")) } | Select-Object -First 1
if (-not $refDir) {
    Write-Error "Khong tim thay thu vien .NET Framework (System.Windows.Forms.dll)."
    exit 1
}

# 2. Uu tien trinh bien dich Roslyn C# hien dai tu .NET SDK (ho tro C# moi nhat)
$dotnetCmd = Get-Command dotnet -ErrorAction SilentlyContinue
$dotnetExe = if ($dotnetCmd) { $dotnetCmd.Source } elseif (Test-Path "$env:ProgramFiles\dotnet\dotnet.exe") { "$env:ProgramFiles\dotnet\dotnet.exe" } else { $null }

$roslynCscDll = $null
$sdkVersionLabel = $null

if ($dotnetExe) {
    $dotnetBase = Split-Path $dotnetExe -Parent
    $sdkRoot = Join-Path $dotnetBase "sdk"
    if (Test-Path $sdkRoot) {
        $sdkDirs = Get-ChildItem -Path $sdkRoot -Directory | ForEach-Object {
            $cscCandidate = Join-Path $_.FullName "Roslyn\bincore\csc.dll"
            if (Test-Path $cscCandidate) {
                $verPart = ($_.Name -split '-')[0]
                $parsedVer = [version]"0.0.0"
                if ([version]::TryParse($verPart, [ref]$parsedVer)) {
                    [PSCustomObject]@{
                        Name       = $_.Name
                        Version    = $parsedVer
                        IsPreview  = $_.Name.Contains('-')
                        CscDllPath = $cscCandidate
                    }
                }
            }
        } | Sort-Object -Property @{ Expression = "Version"; Descending = $true }, @{ Expression = "IsPreview"; Descending = $false }

        $bestSdk = $sdkDirs | Select-Object -First 1
        if ($bestSdk) {
            $roslynCscDll = $bestSdk.CscDllPath
            $sdkVersionLabel = $bestSdk.Name
        }
    }
}

$commonArgs = @(
    "-nologo",
    "-target:winexe",
    "-langversion:latest",
    "-optimize+",
    "-deterministic",
    "-lib:$refDir",
    "-r:mscorlib.dll",
    "-r:System.dll",
    "-r:System.Windows.Forms.dll",
    "-out:$outPath"
)

if (Test-Path $iconPath) {
    $commonArgs += "-win32icon:$iconPath"
}
$commonArgs += $srcPath

if ($roslynCscDll) {
    $roslynVer = (& $dotnetExe $roslynCscDll -version 2>$null | Select-Object -First 1)
    Write-Host "[Compiler] Roslyn C# ($roslynVer | .NET SDK $sdkVersionLabel | -langversion:latest)"
    & $dotnetExe $roslynCscDll @commonArgs
    exit $LASTEXITCODE
}

# 3. Du phong: Tim Roslyn csc.exe cua Visual Studio / MSBuild neu khong co .NET SDK
$vsCscCandidates = @()
foreach ($vsBase in @("${env:ProgramFiles}\Microsoft Visual Studio", "${env:ProgramFiles(x86)}\Microsoft Visual Studio")) {
    if (Test-Path $vsBase) {
        $vsCscCandidates += Get-ChildItem -Path $vsBase -Filter "csc.exe" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -like "*\Roslyn\*\csc.exe" } |
            Select-Object -ExpandProperty FullName
    }
}
$vsCscExe = $vsCscCandidates | Select-Object -First 1

if ($vsCscExe) {
    Write-Host "[Compiler] Visual Studio Roslyn C# ($vsCscExe | -langversion:latest)"
    & $vsCscExe @commonArgs
    exit $LASTEXITCODE
}

# 4. Du phong cuoi cung: Legacy .NET Framework csc.exe (neu may chua cai .NET SDK / VS)
$legacyCsc = "${env:SystemRoot}\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (Test-Path $legacyCsc) {
    Write-Warning "[Compiler] Khong tim thay .NET SDK Roslyn; dang dung ban du phong .NET Framework csc.exe (C# 5)."
    & $legacyCsc /nologo /target:winexe /optimize+ /win32icon:"$iconPath" /out:"$outPath" "$srcPath"
    exit $LASTEXITCODE
}

Write-Error "Khong tim thay trinh bien dich C# nao tren he thong."
exit 1
