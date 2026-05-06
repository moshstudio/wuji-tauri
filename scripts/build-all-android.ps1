# Android全平台自动打包脚本
# 使用方法: .\scripts\build-all-android.ps1 -OutputDir "D:\builds"

param(
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "C:\Users\14438\Desktop\wuji_things",
    [string]$Notes = "",
    [switch]$SkipBuild
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
if (-not $SkipBuild) {
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
} else {
    Write-Host "`n跳过 Android 打包步骤，直接处理现有文件..." -ForegroundColor Yellow
}

# 打包完成统计
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "打包完成!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$allApks = Get-ChildItem -Path $OutputDir -Filter "wuji-$version-*.apk"
Write-Host "共生成 $($allApks.Count) 个APK文件:" -ForegroundColor Green

# 准备更新 updater_android.json
$updaterJsonPath = "C:\Users\14438\Documents\GitHub\wuji-tauri\scripts\update\updater_android.json"
$androidPlatforms = @{}

foreach ($apk in $allApks) {
    $size = [math]::Round($apk.Length / 1MB, 2)
    Write-Host "  - $($apk.Name) ($size MB)" -ForegroundColor Gray
    
    # 构建下载 URL (缤纷云地址)
    $encodedName = [Uri]::EscapeDataString($apk.Name)
    $downloadUrl = "https://wuji.moshangwangluo.com/$encodedName"
    
    # 提取平台名称
    if ($apk.Name -match "wuji-$version-(.*).apk") {
        $platformKey = "android-" + $Matches[1]
        $androidPlatforms[$platformKey] = @{ url = $downloadUrl }
    }
}

# 更新 updater_android.json
if (Test-Path $updaterJsonPath) {
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
        
        # 保留原有的 cloudpan，更新或添加 android 平台
        if (-not $jsonContent.platforms) {
            $jsonContent.platforms = @{}
        }
        
        foreach ($key in $androidPlatforms.Keys) {
            $existingPlatform = $jsonContent.platforms.PSObject.Properties[$key]
            if ($null -ne $existingPlatform) {
                $jsonContent.platforms.$key = $androidPlatforms[$key]
            } else {
                $jsonContent.platforms | Add-Member -MemberType NoteProperty -Name $key -Value $androidPlatforms[$key]
            }
        }
        
        # 保存 JSON (2 空格缩进)
        $jsonRaw = $jsonContent | ConvertTo-Json -Depth 10 -Compress
        
        # 尝试用 Python 进行格式化 (最稳定)
        # 注意：这里需要项目根目录，但脚本中没定义 projectRoot，我们通过当前脚本位置反推
        $scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
        $rootPath = Split-Path $scriptDir -Parent # scripts 目录的上级
        $pythonPath = Join-Path $rootPath ".venv\Scripts\python.exe"
        if (-not (Test-Path $pythonPath)) { $pythonPath = "python" }
        
        try {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonRaw)
            $base64 = [System.Convert]::ToBase64String($bytes)
            $pyCmd = "import json, base64, sys; data=json.loads(base64.b64decode('$base64').decode('utf-8')); print(json.dumps(data, indent=2, ensure_ascii=False))"
            # 使用 Out-String 确保保留从 Python 输出的换行符
            $newJson = & $pythonPath -c $pyCmd | Out-String
            if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($newJson)) { throw "Python 格式化失败" }
        } catch {
            Write-Host "  ⚠ 警告: Python 格式化失败，使用备用正则修复缩进" -ForegroundColor Yellow
            $newJson = $jsonContent | ConvertTo-Json -Depth 10
            $newJson = [regex]::Replace($newJson, "(?m)^( +)", { 
                param($m) 
                $len = $m.Value.Length
                $newLen = [int]($len / 4) * 2
                if ($newLen -lt 2) { $newLen = 2 }
                return " " * $newLen
            })
            $newJson = $newJson -replace '":  +', '": '
        }
        
        # 使用无 BOM 的 UTF-8 编码
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($updaterJsonPath, $newJson, $utf8NoBom)
        
        Write-Host "`n✓ 已更新 updater_android.json" -ForegroundColor Green
    } catch {
        Write-Host "`n✗ 更新 updater_android.json 失败: $_" -ForegroundColor Red
    }
}

Write-Host "所有APK已保存到: $OutputDir" -ForegroundColor Green
Write-Host ""
