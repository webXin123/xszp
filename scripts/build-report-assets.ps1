param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")),
  [switch]$SkipZip
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourcePath = Get-ChildItem -LiteralPath $ProjectRoot -Filter "*.png" | Where-Object {
  $probe = [System.Drawing.Image]::FromFile($_.FullName)
  $match = $probe.Width -eq 941 -and $probe.Height -eq 1672
  $probe.Dispose()
  $match
} | Select-Object -First 1 -ExpandProperty FullName
if (-not $sourcePath) { throw "Could not find the 941x1672 report reference PNG." }

$assetRoot = Join-Path $ProjectRoot "public\report-assets"
$referenceRoot = Join-Path $assetRoot "reference"
New-Item -ItemType Directory -Force -Path $assetRoot, $referenceRoot | Out-Null

Get-ChildItem -LiteralPath $assetRoot -Filter "*.png" -File -ErrorAction SilentlyContinue | Remove-Item -Force

function Save-BackgroundCrop {
  param(
    [System.Drawing.Bitmap]$Source,
    [string]$Name,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [string]$Purpose
  )

  $targetPath = Join-Path $assetRoot "$Name.png"
  $crop = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($crop)
  $graphics.DrawImage($Source, [System.Drawing.Rectangle]::new(0, 0, $Width, $Height), [System.Drawing.Rectangle]::new($X, $Y, $Width, $Height), [System.Drawing.GraphicsUnit]::Pixel)
  $crop.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $crop.Dispose()

  return [ordered]@{
    name = "$Name.png"
    source = [System.IO.Path]::GetFileName($sourcePath)
    x = $X
    y = $Y
    width = $Width
    height = $Height
    purpose = $Purpose
    type = "background"
  }
}

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  $items = @(
    (Save-BackgroundCrop $source "report-header-background" 42 0 858 170 "report header background with school identity, sky, magnolia and skyline"),
    (Save-BackgroundCrop $source "report-footer-background" 42 1552 858 120 "report footer background with campus and skyline")
  )

  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $referenceRoot "student-semester-report-reference.png") -Force

  [ordered]@{
    source = [ordered]@{ file = "student-semester-report-reference.png"; width = $source.Width; height = $source.Height }
    coordinateSystem = "top-left origin; units are source image pixels"
    crops = $items
  } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $assetRoot "manifest.json") -Encoding UTF8

  @(
    "# Student semester report backgrounds",
    "",
    "Only the report header and footer background images are cut from the 941x1672 reference image.",
    "Interior report icons are rendered with the existing Lucide icon library so they remain editable and do not contain baked text or borders.",
    "manifest.json records the exact source coordinates and dimensions."
  ) -join [Environment]::NewLine | Set-Content -LiteralPath (Join-Path $assetRoot "README.md") -Encoding UTF8
}
finally {
  $source.Dispose()
}

if (-not $SkipZip) {
  $zipPath = Join-Path $ProjectRoot "student-semester-report-assets.zip"
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $assetRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
  Write-Output $zipPath
}
