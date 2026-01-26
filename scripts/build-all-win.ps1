# Windows平台打包脚本
# 使用方法: .\scripts\build-all-win.ps1 -Password "你的签名密码"

param(
    [string]$OutputDir = "C:\Users\14438\Desktop\wuji_things",
    [Parameter(Mandatory=$true)]
    [string]$Password
)

# 基础路径
$tauriConfigPath = "C:\Users\14438\Documents\GitHub\wuji-tauri\src-tauri\tauri.conf.json"
$updaterJsonPath = "C:\Users\14438\Documents\GitHub\wuji-tauri\scripts\update\updater_win.json"
$updaterDir = Split-Path $updaterJsonPath -Parent

# 读取Tauri配置获取版本号
$tauriConfig = Get-Content $tauriConfigPath | ConvertFrom-Json
$version = $tauriConfig.version
$productName = $tauriConfig.productName
# 这里假设输出文件名格式为: 无极_版本号_x64-setup.exe (取决于tauri.conf.json配置)

# 构建 artifact 输出路径 (NSIS)
# 根据之前的经验，路径可能在 target/release/bundle/nsis
$nsisOutputPath = "C:\Users\14438\Documents\GitHub\wuji-tauri\src-tauri\target\release\bundle\nsis"

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    Write-Host "创建输出目录: $OutputDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "开始Windows平台打包" -ForegroundColor Cyan
Write-Host "版本号: $version" -ForegroundColor Cyan
Write-Host "输出目录: $OutputDir" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 设置签名密码环境变量
# Tauri 会自动读取此环境变量进行签名，无需交互式输入
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $Password
Write-Host "已设置签名密码环境变量 (TAURI_SIGNING_PRIVATE_KEY_PASSWORD)" -ForegroundColor Green

# 执行构建
Write-Host "`n正在执行 pnpm run tauri:build ..." -ForegroundColor Yellow

# 运行构建命令
pnpm run tauri:build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 构建命令执行完成" -ForegroundColor Green
    
    # 查找生成的exe文件
    # 过滤包含版本号的exe文件，如果找不到尝试找最新的
    $exeFiles = Get-ChildItem -Path $nsisOutputPath -Filter "*${version}*-setup.exe"
    
    if ($exeFiles.Count -eq 0) {
         $exeFiles = Get-ChildItem -Path $nsisOutputPath -Filter "*.exe" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-10) }
    }

    foreach ($exe in $exeFiles) {
        $exeName = $exe.Name
        Write-Host "查找到安装包: $exeName" -ForegroundColor Cyan
        
        # 1. 复制安装包到桌面(OutputDir)
        $destPath = Join-Path $OutputDir $exeName
        Copy-Item $exe.FullName $destPath -Force
        Write-Host "  已复制安装包到: $destPath" -ForegroundColor Gray

        # 2. 处理签名文件 (.sig)
        $sigPath = "$($exe.FullName).sig"
        if (Test-Path $sigPath) {
            # 复制 .sig 文件到 updater_win.json 同级目录
            Copy-Item $sigPath -Destination $updaterDir -Force
            Write-Host "  已复制签名文件到: $updaterDir" -ForegroundColor Gray

            # 读取签名内容并更新 updater_win.json
            $sigContent = Get-Content $sigPath -Raw
            $sigContent = $sigContent.Trim()

            # 读取并更新 JSON
            try {
                $jsonContent = Get-Content $updaterJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
                
                # 更新基础信息
                $jsonContent.version = $version
                $jsonContent.pub_date = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") + "+08:00"
                $jsonContent.notes = "更新版本 $version" # 可选：更新说明

                # 构建下载 URL (假设服务器路径固定)
                $encodedName = [Uri]::EscapeDataString($exeName)
                $downloadUrl = "https://wuji.moshangwangluo.com/$encodedName"

                # 更新 windows-x86_64 节点
                if ($jsonContent.platforms.'windows-x86_64') {
                    $jsonContent.platforms.'windows-x86_64'.signature = $sigContent
                    $jsonContent.platforms.'windows-x86_64'.url = $downloadUrl
                    Write-Host "  已更新 updater_win.json (version, signature, url)" -ForegroundColor Green
                } else {
                    Write-Host "  警告: updater_win.json 中未找到 windows-x86_64 节点" -ForegroundColor Yellow
                }

                # 保存 JSON
                $jsonOptions = @{
                    Depth = 10
                    Compress = $false
                }
                $newJson = $jsonContent | ConvertTo-Json @jsonOptions
                [System.IO.File]::WriteAllText($updaterJsonPath, $newJson, [System.Text.Encoding]::UTF8)

            } catch {
                Write-Host "✗ 更新 updater_win.json 失败: $_" -ForegroundColor Red
            }

        } else {
            Write-Host "  警告: 未找到对应的 .sig 签名文件" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ 构建失败" -ForegroundColor Red
}

# 清理环境变量(可选，PowerShell进程结束也会销毁，但保持环境干净是好习惯)
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $null

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "脚本执行结束" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
