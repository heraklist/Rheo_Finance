param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$sourceDir = Join-Path $RepoRoot "src-tauri\icons\android"
$resDir = Join-Path $RepoRoot "src-tauri\gen\android\app\src\main\res"

if (-not (Test-Path -LiteralPath $sourceDir)) {
  throw "Missing Android icon source directory: $sourceDir"
}

if (-not (Test-Path -LiteralPath $resDir)) {
  throw "Missing generated Android res directory. Run `tauri android init` first."
}

function Resize-Png {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][int]$Size
  )

  $srcImage = [System.Drawing.Image]::FromFile($Source)
  try {
    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($srcImage, 0, 0, $Size, $Size)
      } finally {
        $graphics.Dispose()
      }

      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
      $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $srcImage.Dispose()
  }
}

$legacySource = Join-Path $sourceDir "rheo_launcher_1024.png"
$foregroundSource = Join-Path $sourceDir "rheo_android_foreground_1024.png"
$backgroundSource = Join-Path $sourceDir "rheo_android_background_1024.png"
$monochromeSource = Join-Path $sourceDir "rheo_android_monochrome_1024.png"

$densities = @(
  @{ Name = "mipmap-mdpi"; Size = 48; Foreground = 108 },
  @{ Name = "mipmap-hdpi"; Size = 72; Foreground = 162 },
  @{ Name = "mipmap-xhdpi"; Size = 96; Foreground = 216 },
  @{ Name = "mipmap-xxhdpi"; Size = 144; Foreground = 324 },
  @{ Name = "mipmap-xxxhdpi"; Size = 192; Foreground = 432 }
)

foreach ($density in $densities) {
  $dir = Join-Path $resDir $density.Name
  Resize-Png -Source $legacySource -Destination (Join-Path $dir "ic_launcher.png") -Size $density.Size
  Resize-Png -Source $legacySource -Destination (Join-Path $dir "ic_launcher_round.png") -Size $density.Size
  Resize-Png -Source $foregroundSource -Destination (Join-Path $dir "ic_launcher_foreground.png") -Size $density.Foreground
}

$drawableDir = Join-Path $resDir "drawable"
$drawableV24Dir = Join-Path $resDir "drawable-v24"
Remove-Item -LiteralPath (Join-Path $drawableDir "ic_launcher_background.xml") -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $drawableV24Dir "ic_launcher_foreground.xml") -ErrorAction SilentlyContinue

Resize-Png -Source $backgroundSource -Destination (Join-Path $drawableDir "ic_launcher_background.png") -Size 432
Resize-Png -Source $foregroundSource -Destination (Join-Path $drawableDir "ic_launcher_foreground.png") -Size 432
Resize-Png -Source $monochromeSource -Destination (Join-Path $drawableDir "ic_launcher_monochrome.png") -Size 432

$adaptiveDir = Join-Path $resDir "mipmap-anydpi-v26"
New-Item -ItemType Directory -Force -Path $adaptiveDir | Out-Null

$adaptiveXml = @'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
'@

Set-Content -Path (Join-Path $adaptiveDir "ic_launcher.xml") -Value $adaptiveXml -Encoding UTF8
Set-Content -Path (Join-Path $adaptiveDir "ic_launcher_round.xml") -Value $adaptiveXml -Encoding UTF8

Write-Output "Android launcher icons refreshed from $sourceDir"
