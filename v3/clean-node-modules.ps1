# Node_modules 批量清理脚本 (PowerShell)
# 使用方法: .\clean-node-modules.ps1 [目录路径]

param(
    [string]$TargetPath = ".",
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose,
    [string]$MaxSize
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 格式化文件大小
function Format-Size {
    param([long]$Bytes)

    $units = @("B", "KB", "MB", "GB", "TB")
    $size = $Bytes
    $unitIndex = 0

    while ($size -ge 1024 -and $unitIndex -lt $units.Length - 1) {
        $size /= 1024
        $unitIndex++
    }

    return "{0:N2} {1}" -f $size, $units[$unitIndex]
}

# 获取文件夹大小
function Get-FolderSize {
    param([string]$Path)

    try {
        $size = 0
        Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue |
            ForEach-Object {
                if ($_.PSIsContainer) {
                    # 文件夹大小由其内容计算
                } else {
                    $size += $_.Length
                }
            }
        return $size
    } catch {
        return 0
    }
}

# 删除文件夹
function Remove-Folder {
    param([string]$Path)

    try {
        if (Test-Path $Path) {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            return @{ Success = $true; Error = $null }
        } else {
            return @{ Success = $false; Error = "Path does not exist" }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# 解析大小字符串
function Parse-Size {
    param([string]$SizeStr)

    $units = @{
        "B" = 1
        "KB" = 1KB
        "MB" = 1MB
        "GB" = 1GB
        "TB" = 1TB
    }

    if ($SizeStr -match '^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$') {
        $size = [double]$Matches[1]
        $unit = $Matches[2].ToUpper()
        return $size * $units[$unit]
    } else {
        return $null
    }
}

# 主函数
function Main {
    # 验证目标路径
    $absolutePath = Resolve-Path $TargetPath -ErrorAction SilentlyContinue
    if (-not $absolutePath) {
        Write-ColorOutput "❌ 错误: 路径不存在: $TargetPath" -Color Red
        exit 1
    }

    # 解析最大大小限制
    $maxSizeBytes = $null
    if ($MaxSize) {
        $maxSizeBytes = Parse-Size -SizeStr $MaxSize
        if ($maxSizeBytes -eq $null) {
            Write-ColorOutput "❌ 错误: 无效的大小格式: $MaxSize" -Color Red
            exit 1
        }
    }

    # 初始化统计
    $stats = @{
        TotalFound = 0
        TotalDeleted = 0
        TotalFailed = 0
        TotalSkipped = 0
        TotalSizeFreed = 0
        StartTime = Get-Date
    }

    # 显示开始信息
    Write-Host "`n🔍 开始扫描 node_modules 文件夹...`n" -ForegroundColor Cyan
    Write-ColorOutput "📁 目标路径: $($absolutePath.Path)" -Color Blue
    Write-ColorOutput "🔧 模式: $(if ($DryRun) { '试运行' } else { '实际删除' })" -Color Blue
    Write-ColorOutput "⚡ 强制模式: $(if ($Force) { '是' } else { '否' })" -Color Blue
    if ($maxSizeBytes) {
        Write-ColorOutput "📏 最大大小限制: $(Format-Size $maxSizeBytes)" -Color Blue
    }
    Write-Host ""

    # 查找所有 node_modules 文件夹
    try {
        $nodeModulesFolders = Get-ChildItem -Path $absolutePath.Path -Recurse -Directory -Name "node_modules" -ErrorAction SilentlyContinue

        if ($nodeModulesFolders.Count -eq 0) {
            Write-ColorOutput "✅ 未找到任何 node_modules 文件夹" -Color Green
            return
        }

        foreach ($folder in $nodeModulesFolders) {
            $fullPath = Join-Path $absolutePath.Path $folder
            $stats.TotalFound++

            try {
                # 获取文件夹大小
                $folderSize = Get-FolderSize -Path $fullPath

                # 检查大小限制
                if ($maxSizeBytes -and $folderSize -gt $maxSizeBytes) {
                    Write-ColorOutput "⚠️  跳过 (太大): $fullPath ($(Format-Size $folderSize))" -Color Yellow
                    $stats.TotalSkipped++
                    continue
                }

                # 显示找到的文件夹
                Write-ColorOutput "📦 发现: $fullPath ($(Format-Size $folderSize))" -Color Cyan

                if (-not $DryRun) {
                    # 确认删除（除非使用 -Force）
                    if (-not $Force) {
                        $response = Read-Host "确认删除? [y/N]"
                        if ($response.ToLower() -ne 'y' -and $response.ToLower() -ne 'yes') {
                            Write-ColorOutput "❌ 跳过" -Color Yellow
                            $stats.TotalSkipped++
                            continue
                        }
                    }

                    # 执行删除
                    Write-ColorOutput "🗑️  正在删除: $fullPath..." -Color Red
                    $result = Remove-Folder -Path $fullPath

                    if ($result.Success) {
                        Write-ColorOutput "✅ 删除成功: $fullPath (释放 $(Format-Size $folderSize))" -Color Green
                        $stats.TotalDeleted++
                        $stats.TotalSizeFreed += $folderSize

                        if ($Verbose) {
                            Write-ColorOutput "   详细信息: $($result.Error)" -Color Blue
                        }
                    } else {
                        Write-ColorOutput "❌ 删除失败: $fullPath" -Color Red
                        Write-ColorOutput "   错误: $($result.Error)" -Color Red
                        $stats.TotalFailed++
                    }
                } else {
                    Write-ColorOutput "🔍 [试运行] 将删除: $fullPath ($(Format-Size $folderSize))" -Color Yellow
                    $stats.TotalSizeFreed += $folderSize
                }

            } catch {
                Write-ColorOutput "❌ 处理失败: $fullPath - $($_.Exception.Message)" -Color Red
                $stats.TotalFailed++
            }
        }

    } catch {
        Write-ColorOutput "❌ 扫描失败: $($_.Exception.Message)" -Color Red
    }

    # 显示统计信息
    $duration = (Get-Date) - $stats.StartTime

    Write-Host "`n📊 扫完成绩统计:`n" -ForegroundColor Cyan -BackgroundColor Black
    Write-ColorOutput "✅ 发现数量: $($stats.TotalFound)" -Color Green
    Write-ColorOutput "✅ 删除成功: $($stats.TotalDeleted)" -Color Green
    Write-ColorOutput "❌ 删除失败: $($stats.TotalFailed)" -Color Red
    Write-ColorOutput "⚠️  跳过数量: $($stats.TotalSkipped)" -Color Yellow
    Write-ColorOutput "💾 释放空间: $(Format-Size $stats.TotalSizeFreed)" -Color Cyan
    Write-ColorOutput "⏱️  执行时间: $($duration.TotalSeconds.ToString('F2'))s" -Color Blue

    if ($DryRun) {
        Write-Host "`n💡 这是试运行模式，没有实际删除文件" -ForegroundColor Yellow
        Write-Host "   如要实际删除，请移除 -DryRun 参数" -ForegroundColor Cyan
    }

    Write-Host ""

    # 退出码
    if ($stats.TotalFailed -gt 0) {
        exit 1
    } else {
        Write-Host "🎉 清理完成！" -ForegroundColor Green
        exit 0
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "`n📦 Node-modules 清理工具 (PowerShell)`n" -ForegroundColor Cyan
    Write-Host "使用方法:"
    Write-Host "  .\clean-node-modules.ps1 [选项] [目录路径]`n"
    Write-Host "选项:"
    Write-Host "  -DryRun        试运行（只显示，不删除）"
    Write-Host "  -Force         强制删除（不询问确认）"
    Write-Host "  -Verbose       详细输出"
    Write-Host "  -MaxSize SIZE  最大删除大小限制（如: 500MB, 1GB）"
    Write-Host "  -Help          显示帮助信息`n"
    Write-Host "示例:"
    Write-Host "  .\clean-node-modules.ps1 ."
    Write-Host "  .\clean-node-modules.ps1 -DryRun -Force .\projects"
    Write-Host "  .\clean-node-modules.ps1 -MaxSize 500MB .\workspace"
}

# 检查是否请求帮助
if ($args -contains "-Help" -or $args -contains "--help") {
    Show-Help
    return
}

# 执行主函数
Main