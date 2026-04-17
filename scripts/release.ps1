# 一键发布脚本 (Windows + Android + Upload)
# 使用方法: .\scripts\release.ps1

$projectRoot = "C:\Users\14438\Documents\GitHub\wuji-tauri"
$outputDir = "C:\Users\14438\Desktop\wuji_things"
$tauriConfigPath = Join-Path $projectRoot "src-tauri\tauri.conf.json"

# 1. 获取并确认当前版本
if (-not (Test-Path $tauriConfigPath)) {
    Write-Host "✗ 找不到 tauri.conf.json，请在项目根目录运行" -ForegroundColor Red
    exit 1
}

$tauriConfig = Get-Content $tauriConfigPath | ConvertFrom-Json
$version = $tauriConfig.version

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "      🚀 无极 Tauri 一键发布系统" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "当前待发布版本: $version" -ForegroundColor Green
Write-Host "输出目录: $outputDir" -ForegroundColor Gray

$confirmVersion = Read-Host "确认版本号无误？(输入 y 继续，或输入其他内容中止)"
if ($confirmVersion -ne "y") {
    Write-Host "发布中止。请在 tauri.conf.json 中修改版本号后再运行。" -ForegroundColor Yellow
    exit 0
}

# 2. 定义发布平台与检查其状态
$platforms = @(
    @{ 
        Label = "Windows"; 
        File = "无极_${version}_x64-setup.exe"; 
        Script = "build-all-win.ps1"; 
        NeedsPwd = $true 
    },
    @{ 
        Label = "Android"; 
        File = "wuji-${version}-universal.apk"; 
        Script = "build-all-android.ps1"; 
        NeedsPwd = $false 
    }
)

foreach ($p in $platforms) {
    $p.Path = Join-Path $outputDir $p.File
    $p.DoBuild = $true
    
    if (Test-Path $p.Path) {
        Write-Host "`n[!] 发现 $($p.Label) 安装包已存在: $($p.File)" -ForegroundColor Yellow
        $ans = Read-Host "是否重新打包 $($p.Label)？(回车跳过，输入 y 重新打包) [y/N]"
        if ($ans -ne "y") {
            $p.DoBuild = $false
            Write-Host "--> 已选择：跳过 $($p.Label) 打包" -ForegroundColor Cyan
        }
    }
}

# 3. 发布同步确认与更新说明
Write-Host "`n======================================" -ForegroundColor Cyan
$doUpload = Read-Host "是否同步发布到缤纷云 (BinfenYun)？(y/N)"

$releaseNotes = ""
# 只要有打包任务或需要同步上传，就要求输入 Notes
$needsAction = ($doUpload -eq "y")
foreach ($p in $platforms) { if ($p.DoBuild) { $needsAction = $true } }

if ($needsAction) {
    Write-Host "`n📝 请输入版本更新说明 (Notes):" -ForegroundColor Yellow
    $releaseNotes = Read-Host "内容"
    if ([string]::IsNullOrWhiteSpace($releaseNotes)) {
        $releaseNotes = "更新版本 $version"
        Write-Host "--> 未输入内容，将使用默认说明: $releaseNotes" -ForegroundColor Gray
    }
}

# 4. 执行工作流 (工件准备与元数据更新)
Write-Host "`n[1/2] 📦 正在准备发布工件..." -ForegroundColor Yellow

foreach ($p in $platforms) {
    if ($p.DoBuild) {
        Write-Host "`n  --> 正在打包 $($p.Label)..." -ForegroundColor Cyan
        $params = @{ Notes = $releaseNotes }
        
        if ($p.NeedsPwd) {
            $password = Read-Host "  请输入 $($p.Label) 签名密码 (必填)"
            if ([string]::IsNullOrWhiteSpace($password)) {
                Write-Host "  ✗ 必须输入密码才能进行 $($p.Label) 打包" -ForegroundColor Red
                exit 1
            }
            $params["Password"] = $password
        }
        
        & "$projectRoot\scripts\$($p.Script)" @params
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ $($p.Label) 打包失败，发布中止" -ForegroundColor Red
            exit 1
        }
    } elseif (-not [string]::IsNullOrWhiteSpace($releaseNotes)) {
        Write-Host "`n  --> 正在同步 $($p.Label) 更新说明 (跳过打包)..." -ForegroundColor Gray
        $params = @{ SkipBuild = $true; Notes = $releaseNotes }
        if ($p.NeedsPwd) { $params["Password"] = "skip" }
        & "$projectRoot\scripts\$($p.Script)" @params
    } else {
        Write-Host "`n  --> 已跳过 $($p.Label) 处理" -ForegroundColor Gray
    }
}

# 6. 运行上传脚本 (同步到缤纷云)
if ($doUpload -eq "y") {
    Write-Host "`n[2/2] ☁️ 开始同步到缤纷云 (BinfenYun)..." -ForegroundColor Yellow
    $venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        & $venvPython "$projectRoot\scripts\update\uploadToBinfenyun.py"
    } else {
        Write-Host "⚠ 警告: 找不到虚拟环境路径 $venvPython，将尝试使用系统 Python 执行" -ForegroundColor Yellow
        python "$projectRoot\scripts\update\uploadToBinfenyun.py"
    }
} else {
    Write-Host "`n[2/2] --> 已跳过缤纷云同步上传。" -ForegroundColor Yellow
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n======================================" -ForegroundColor Green
    Write-Host "✅ 发布流程执行完毕！" -ForegroundColor Green
    Write-Host "--------------------------------------" -ForegroundColor Gray
    Write-Host "后续建议操作：" -ForegroundColor Cyan
    Write-Host "1. 蓝奏云: 上传通用 APK" -ForegroundColor Cyan
    Write-Host "2. 缤纷云: 刷新 CDN 缓存 (updater_*.json)" -ForegroundColor Cyan
    Write-Host "3. GitHub: 创建新的 Release 并上传安装包" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Green
} else {
    Write-Host "✗ 同步脚本执行出错" -ForegroundColor Red
}
