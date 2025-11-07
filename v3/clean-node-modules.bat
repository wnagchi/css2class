@echo off
:: Node_modules 批量清理脚本 (Windows)
:: 使用方法: clean-node-modules.bat [目录路径]

setlocal enabledelayedexpansion

:: 设置默认目录
set TARGET_DIR=%1
if "%TARGET_DIR%"=="" set TARGET_DIR=.

:: 颜色代码
set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set CYAN=[96m
set BOLD=[1m
set RESET=[0m

echo %BOLD%%CYAN%📦 Node_modules 批量清理工具%RESET%
echo.

:: 检查目标目录是否存在
if not exist "%TARGET_DIR%" (
    echo %RED%❌ 错误: 目录不存在: %TARGET_DIR%%RESET%
    pause
    exit /b 1
)

:: 显示开始信息
echo %BLUE%📁 目标目录: %TARGET_DIR%%RESET%
echo %YELLOW%⚠️  警告: 将删除所有 node_modules 文件夹%RESET%
echo.

:: 询问确认
set /p CONFIRM=确认继续吗? (y/N):
if /i not "%CONFIRM%"=="y" if /i not "%CONFIRM%"=="yes" (
    echo %YELLOW%❌ 操作已取消%RESET%
    pause
    exit /b 0
)

echo.
echo %GREEN%🔍 开始扫描...%RESET%
echo.

:: 初始化计数器
set /a COUNT_FOUND=0
set /a COUNT_DELETED=0
set /a COUNT_FAILED=0

:: 递归查找并删除 node_modules 文件夹
for /f "delims=" %%D in ('dir /s /b /a:d "%TARGET_DIR%\node_modules" 2^>nul') do (
    set /a COUNT_FOUND+=1

    :: 计算文件夹大小
    set FOLDER_SIZE=0
    for /f "delims=" %%F in ('dir /s "%%D" 2^>nul ^| find "个文件"') do (
        set FOLDER_LINE=%%F
    )

    :: 显示找到的文件夹
    echo %CYAN%📦 发现: %%D%RESET%

    :: 尝试删除
    echo %RED%🗑️  正在删除: %%D...%RESET%

    :: 使用 rd 命令删除文件夹
    rd /s /q "%%D" 2>nul

    :: 检查是否删除成功
    if exist "%%D" (
        echo %RED%❌ 删除失败: %%D%RESET%
        set /a COUNT_FAILED+=1
    ) else (
        echo %GREEN%✅ 删除成功: %%D%RESET%
        set /a COUNT_DELETED+=1
    )

    echo.
)

:: 显示统计结果
echo %BOLD%%CYAN%📊 清理完成统计:%RESET%
echo %GREEN%✅ 发现数量: %COUNT_FOUND%%RESET%
echo %GREEN%✅ 删除成功: %COUNT_DELETED%%RESET%
echo %RED%❌ 删除失败: %COUNT_FAILED%%RESET%
echo.

if %COUNT_FAILED% equ 0 (
    echo %BOLD%%GREEN%🎉 清理完成！%RESET%
) else (
    echo %YELLOW%⚠️  部分删除失败，请检查权限%RESET%
)

pause