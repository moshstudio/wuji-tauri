# 一键发布脚本 (Windows + Android + Upload)
# 使用方法: .\scripts\release.ps1

$projectRoot = "C:\Users\14438\Documents\GitHub\wuji-tauri"
$outputDir = "C:\Users\14438\Desktop\wuji_things"
$tauriConfigPath = Join-Path $projectRoot "src-tauri\tauri.conf.json"

# 1. 获取当前版本
if (-not (Test-Path $tauriConfigPath)) {
    Write-Host "✗ 找不到 tauri.conf.json，请在项目根目录运行" -ForegroundColor Red
    exit 1
}

$tauriConfig = Get-Content $tauriConfigPath | ConvertFrom-Json
$version = $tauriConfig.version
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "准备发布版本: $version" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 2. 检查安装包是否已存在
$winInstallerName = "无极_${version}_x64-setup.exe"
$winInstallerPath = Join-Path $outputDir $winInstallerName
$androidInstallerName = "wuji-${version}-universal.apk"
$androidInstallerPath = Join-Path $outputDir $androidInstallerName

$skipBuild = $false
if ((Test-Path $winInstallerPath) -or (Test-Path $androidInstallerPath)) {
    Write-Host "发现版本 $version 的安装包已存在于: $outputDir" -ForegroundColor Yellow
    $choice = Read-Host "输入 'y' 重新打包，直接回车或输入 'n' 跳过打包直接同步 [y/N]"
    if ($choice -ne "y") {
        $skipBuild = $true
        Write-Host "--> 跳过打包，直接进入同步阶段..." -ForegroundColor Cyan
    }
}

if (-not $skipBuild) {
    # 3. 运行 Windows 打包
    Write-Host "`n[1/2] 开始 Windows 打包..." -ForegroundColor Yellow
    $password = Read-Host "请输入 Windows 签名密码 (必填)"
    if ([string]::IsNullOrWhiteSpace($password)) {
        Write-Host "✗ 必须输入密码才能进行 Windows 签名打包" -ForegroundColor Red
        exit 1
    }
    
    & "$projectRoot\scripts\build-all-win.ps1" -Password $password
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Windows 打包失败，发布中止" -ForegroundColor Red
        exit 1
    }

    # 4. 运行 Android 打包
    Write-Host "`n[2/2] 开始 Android 打包..." -ForegroundColor Yellow
    & "$projectRoot\scripts\build-all-android.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Android 打包失败，发布中止" -ForegroundColor Red
        exit 1
    }
}

# 5. 运行上传脚本
Write-Host "`n开始同步到缤纷云 (BinfenYun)..." -ForegroundColor Yellow
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    & $venvPython "$projectRoot\scripts\update\uploadToBinfenyun.py"
} else {
    Write-Host "⚠ 警告: 找不到虚拟环境路径 $venvPython，将尝试使用系统 Python 执行" -ForegroundColor Yellow
    python "$projectRoot\scripts\update\uploadToBinfenyun.py"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n======================================" -ForegroundColor Green
    Write-Host "✓ 发布流程执行完毕！" -ForegroundColor Green
    Write-Host "请去蓝奏云继续进行上传" -ForegroundColor Cyan
    Write-Host "请去缤纷云刷新cdn缓存" -ForegroundColor Cyan
    Write-Host "请去github进行版本发布" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Green
} else {
    Write-Host "✗ 同步脚本执行出错" -ForegroundColor Red
}
