# Android全平台自动打包脚本
# 使用方法: .\scripts\build-all-android.ps1 -OutputDir "D:\builds"

param(
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "C:\Users\14438\Desktop\wuji_things"
)

# 定义Android目标平台
$targets = @(
    "aarch64",
    "armv7",
    "i686",
    "x86_64"
)

# 构建输出路径
$apkSourcePath = "C:\Users\14438\Documents\GitHub\wuji-tauri\src-tauri\gen\android\app\build\outputs\apk\universal\release"

# 读取版本号
$tauriConfig = Get-Content "C:\Users\14438\Documents\GitHub\wuji-tauri\src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    Write-Host "创建输出目录: $OutputDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "开始Android全平台打包" -ForegroundColor Cyan
Write-Host "版本号: $version" -ForegroundColor Cyan
Write-Host "输出目录: $OutputDir" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 首先打包通用版本（不加target参数）
Write-Host "`n[1/5] 正在打包通用版本..." -ForegroundColor Yellow
try {
    pnpm tauri android build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 通用版本打包成功" -ForegroundColor Green
        
        # 复制APK到输出目录
        $apkFiles = Get-ChildItem -Path $apkSourcePath -Filter "*.apk"
        foreach ($apk in $apkFiles) {
            $newName = "wuji-$version-universal.apk"
            $destPath = Join-Path $OutputDir $newName
            Copy-Item $apk.FullName $destPath -Force
            Write-Host "  已保存: $newName" -ForegroundColor Gray
        }
    } else {
        Write-Host "✗ 通用版本打包失败" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 通用版本打包出错: $_" -ForegroundColor Red
}

# 打包每个平台
$index = 2
foreach ($target in $targets) {
    Write-Host "`n[$index/5] 正在打包 $target 平台..." -ForegroundColor Yellow
    
    try {
        pnpm tauri android build --target $target
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $target 平台打包成功" -ForegroundColor Green
            
            # 复制APK到输出目录
            if (Test-Path $apkSourcePath) {
                $apkFiles = Get-ChildItem -Path $apkSourcePath -Filter "*.apk"
                foreach ($apk in $apkFiles) {
                    $newName = "wuji-$version-${target}.apk"
                    $destPath = Join-Path $OutputDir $newName
                    Copy-Item $apk.FullName $destPath -Force
                    Write-Host "  已保存: $newName" -ForegroundColor Gray
                }
            } else {
                Write-Host "  警告: 找不到APK文件路径" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✗ $target 平台打包失败" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $target 平台打包出错: $_" -ForegroundColor Red
    }
    
    $index++
}

# 打包完成统计
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "打包完成!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$allApks = Get-ChildItem -Path $OutputDir -Filter "wuji-$version-*.apk"
Write-Host "共生成 $($allApks.Count) 个APK文件:" -ForegroundColor Green
foreach ($apk in $allApks) {
    $size = [math]::Round($apk.Length / 1MB, 2)
    Write-Host "  - $($apk.Name) ($size MB)" -ForegroundColor Gray
}

Write-Host "所有APK已保存到: $OutputDir" -ForegroundColor Green
Write-Host ""
