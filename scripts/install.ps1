#
# VibeCoin Node Installation Script for Windows
# Run your own VibeCoin node on your PC
#
# Usage (in PowerShell):
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/IOSBLKSTUDIO/VibeCoin/master/scripts/install.ps1'))
#
# Or download and run:
#   .\install.ps1
#

$ErrorActionPreference = "Stop"

# Colors
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

# Banner
Write-Host ""
Write-Color "╔═══════════════════════════════════════════════════════════════════╗" "Magenta"
Write-Color "║                                                                   ║" "Magenta"
Write-Color "║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ██████╗ ██╗███╗   ██╗     ║" "Magenta"
Write-Color "║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██║████╗  ██║     ║" "Magenta"
Write-Color "║   ██║   ██║██║██████╔╝█████╗  ██║     ██║   ██║██║██╔██╗ ██║     ║" "Magenta"
Write-Color "║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║   ██║██║██║╚██╗██║     ║" "Magenta"
Write-Color "║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗╚██████╔╝██║██║ ╚████║     ║" "Magenta"
Write-Color "║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝     ║" "Magenta"
Write-Color "║                                                                   ║" "Magenta"
Write-Color "║                 Node Installation Script v1.0                     ║" "Magenta"
Write-Color "║                                                                   ║" "Magenta"
Write-Color "╚═══════════════════════════════════════════════════════════════════╝" "Magenta"
Write-Host ""

Write-Color "Welcome to VibeCoin! Let's set up your node." "Cyan"
Write-Host ""

# Installation directory
$InstallDir = "$env:USERPROFILE\.vibecoin"
$DataDir = "$InstallDir\data"

# Check for Node.js
Write-Color "Checking requirements..." "Blue"

$nodeInstalled = $false
try {
    $nodeVersion = node -v
    $nodeInstalled = $true
    Write-Color "✓ Node.js $nodeVersion found" "Green"
} catch {
    Write-Color "Node.js not found." "Yellow"
}

if (-not $nodeInstalled) {
    Write-Color "Installing Node.js via winget..." "Yellow"

    try {
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Color "Please install Node.js manually from: https://nodejs.org" "Red"
        Write-Color "Then run this script again." "Red"
        exit 1
    }
}

# Check npm
try {
    $npmVersion = npm -v
    Write-Color "✓ npm $npmVersion found" "Green"
} catch {
    Write-Color "npm not found. Please reinstall Node.js." "Red"
    exit 1
}

# Check for Git
$gitInstalled = $false
try {
    $gitVersion = git --version
    $gitInstalled = $true
    Write-Color "✓ $gitVersion found" "Green"
} catch {
    Write-Color "Git not found. Installing..." "Yellow"
    try {
        winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Color "Please install Git manually from: https://git-scm.com" "Red"
        exit 1
    }
}

# Create installation directory
Write-Host ""
Write-Color "Setting up VibeCoin..." "Blue"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

Set-Location $InstallDir

# Clone or update repository
if (Test-Path "$InstallDir\VibeCoin") {
    Write-Color "Updating existing installation..." "Yellow"
    Set-Location VibeCoin
    git pull origin master
} else {
    Write-Color "Downloading VibeCoin..." "Yellow"
    git clone https://github.com/IOSBLKSTUDIO/VibeCoin.git
    Set-Location VibeCoin
}

# Install dependencies
Write-Host ""
Write-Color "Installing dependencies..." "Blue"
npm install

# Build
Write-Host ""
Write-Color "Building VibeCoin..." "Blue"
npm run build

# Create start scripts
Write-Host ""
Write-Color "Creating launcher scripts..." "Blue"

# Batch file for node
$nodeBat = @"
@echo off
cd /d "%USERPROFILE%\.vibecoin\VibeCoin"
node dist\cli.js --network testnet --data "%USERPROFILE%\.vibecoin\data" %*
"@
Set-Content -Path "$InstallDir\vibecoin-node.bat" -Value $nodeBat

# Batch file for miner
$minerBat = @"
@echo off
cd /d "%USERPROFILE%\.vibecoin\VibeCoin"
node dist\cli.js --network testnet --data "%USERPROFILE%\.vibecoin\data" --mine --miner new %*
"@
Set-Content -Path "$InstallDir\vibecoin-mine.bat" -Value $minerBat

# Add to PATH (user level)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$InstallDir", "User")
    Write-Color "✓ Added VibeCoin to PATH" "Green"
}

# Success message
Write-Host ""
Write-Color "═══════════════════════════════════════════════════════════════════" "Green"
Write-Color "                    Installation Complete!                          " "Green"
Write-Color "═══════════════════════════════════════════════════════════════════" "Green"
Write-Host ""
Write-Color "Your VibeCoin node is ready! Here's how to use it:" "Cyan"
Write-Host ""
Write-Color "Start a node:" "Yellow"
Write-Host "  $InstallDir\vibecoin-node.bat"
Write-Host ""
Write-Color "Start a mining node:" "Yellow"
Write-Host "  $InstallDir\vibecoin-mine.bat"
Write-Host ""
Write-Color "Or open a new terminal and use:" "Yellow"
Write-Host "  vibecoin-node       # Start a regular node"
Write-Host "  vibecoin-mine       # Start a mining node"
Write-Host ""
Write-Color "Data is stored in: $DataDir" "Cyan"
Write-Host ""
Write-Color "Join the network and help decentralize VibeCoin!" "Magenta"
Write-Color "Every node makes the network stronger." "Magenta"
Write-Host ""
Write-Color "Learn more: https://github.com/IOSBLKSTUDIO/VibeCoin" "Blue"
Write-Host ""

# Pause before exit
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
