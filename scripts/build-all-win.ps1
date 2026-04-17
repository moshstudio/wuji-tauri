# Windows平台打包脚本
# 使用方法: .\scripts\build-all-win.ps1 -Password "你的签名密码"

param(
    [string]$OutputDir = "C:\Users\14438\Desktop\wuji_things",
    [Parameter(Mandatory=$false)] # 修改为非强制，因为 SkipBuild 时不需要
    [string]$Password,
    [string]$Notes = "",
    [switch]$SkipBuild
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

# 执行构建
if (-not $SkipBuild) {
    if ([string]::IsNullOrWhiteSpace($Password)) {
        Write-Host "✗ 错误: 打包模式必须提供签名密码 (-Password)" -ForegroundColor Red
        exit 1
    }
    
    # 设置签名密码环境变量
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $Password
    Write-Host "已设置签名密码环境变量 (TAURI_SIGNING_PRIVATE_KEY_PASSWORD)" -ForegroundColor Green

    Write-Host "`n正在执行 pnpm run tauri:build ..." -ForegroundColor Yellow
    pnpm run tauri:build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 构建失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 构建命令执行完成" -ForegroundColor Green
} else {
    Write-Host "跳过打包步骤，直接处理现有文件..." -ForegroundColor Yellow
}

# 此时无论是刚构建完还是跳过构建，都检查输出目录是否有 artifact
if ($true) { # 始终执行后续的同步和 JSON 更新逻辑
    
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
                if ([string]::IsNullOrWhiteSpace($Notes)) {
                    $jsonContent.notes = "更新版本 $version"
                } else {
                    $jsonContent.notes = $Notes
                }

                # 构建下载 URL (假设服务器路径固定)
                $encodedName = [Uri]::EscapeDataString($exeName)
                $downloadUrl = "https://wuji.moshangwangluo.com/$encodedName"

                # 更新所有平台节点
                $platforms = $jsonContent.platforms.PSObject.Properties | Select-Object -ExpandProperty Name
                foreach ($platform in $platforms) {
                    if ($jsonContent.platforms.$platform) {
                        $jsonContent.platforms.$platform.signature = $sigContent
                        $jsonContent.platforms.$platform.url = $downloadUrl
                    }
                }
                Write-Host "  已更新 updater_win.json (所有平台)" -ForegroundColor Green

                # 保存 JSON (2 空格缩进)
                $jsonRaw = $jsonContent | ConvertTo-Json -Depth 10 -Compress
                
                # 尝试用 Python 进行格式化 (最稳定)
                $pythonPath = Join-Path $projectRoot ".venv\Scripts\python.exe"
                if (-not (Test-Path $pythonPath)) { $pythonPath = "python" }
                
                try {
                    # 使用 Base64 传递数据以规避转义问题
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonRaw)
                    $base64 = [System.Convert]::ToBase64String($bytes)
                    $pyCmd = "import json, base64, sys; data=json.loads(base64.b64decode('$base64').decode('utf-8')); print(json.dumps(data, indent=2, ensure_ascii=False))"
                    # 使用 Out-String 确保保留换行符，避免变成单行
                    $newJson = & $pythonPath -c $pyCmd | Out-String
                    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($newJson)) { throw "Python 格式化失败" }
                } catch {
                    # 备用方案：暴力正则修复
                    Write-Host "  ⚠ 警告: Python 格式化失败，使用备用正则修复缩进" -ForegroundColor Yellow
                    $newJson = $jsonContent | ConvertTo-Json -Depth 10
                    $newJson = [regex]::Replace($newJson, "(?m)^( +)", { 
                        param($m) 
                        $len = $m.Value.Length
                        # 尝试将大缩进压缩 (假设 11 -> 4, 22 -> 6 等)
                        # 这里简单处理：超过 4 的都减半再减半
                        $newLen = [int]($len / 4) * 2
                        if ($newLen -lt 2) { $newLen = 2 }
                        return " " * $newLen
                    })
                    $newJson = $newJson -replace '":  +', '": '
                }
                
                # 使用无 BOM 的 UTF-8 编码
                $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                [System.IO.File]::WriteAllText($updaterJsonPath, $newJson, $utf8NoBom)

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
