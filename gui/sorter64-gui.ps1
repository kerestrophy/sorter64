# sorter64 GUI launcher (WinForms)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$defaultInputDir = 'O:\'
$defaultOutputDir = 'O:\Firma Schach Dojo\sorter64\output'

$scriptRoot = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptRoot
$runBat = Join-Path $projectRoot 'dist\run-cli.bat'

function Show-Error([string]$message) {
  [System.Windows.Forms.MessageBox]::Show($message, 'sorter64', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

function Show-Info([string]$message) {
  [System.Windows.Forms.MessageBox]::Show($message, 'sorter64', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'sorter64 Launcher - select an input PGN or folder'
$form.Size = New-Object System.Drawing.Size(640, 390)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $true

$lblInput = New-Object System.Windows.Forms.Label
$lblInput.Text = 'Input PGN / Folder'
$lblInput.Location = New-Object System.Drawing.Point(12, 20)
$lblInput.Size = New-Object System.Drawing.Size(120, 20)

$txtInput = New-Object System.Windows.Forms.TextBox
$txtInput.Location = New-Object System.Drawing.Point(140, 18)
$txtInput.Size = New-Object System.Drawing.Size(380, 20)

$btnInput = New-Object System.Windows.Forms.Button
$btnInput.Text = 'Browse File...'
$btnInput.Location = New-Object System.Drawing.Point(430, 16)
$btnInput.Size = New-Object System.Drawing.Size(90, 24)

$btnInputFolder = New-Object System.Windows.Forms.Button
$btnInputFolder.Text = 'Browse Folder...'
$btnInputFolder.Location = New-Object System.Drawing.Point(530, 16)
$btnInputFolder.Size = New-Object System.Drawing.Size(90, 24)

$lblOutput = New-Object System.Windows.Forms.Label
$lblOutput.Text = 'Output Folder'
$lblOutput.Location = New-Object System.Drawing.Point(12, 60)
$lblOutput.Size = New-Object System.Drawing.Size(120, 20)

$txtOutput = New-Object System.Windows.Forms.TextBox
$txtOutput.Location = New-Object System.Drawing.Point(140, 58)
$txtOutput.Size = New-Object System.Drawing.Size(380, 20)
$txtOutput.Text = $defaultOutputDir

$btnOutput = New-Object System.Windows.Forms.Button
$btnOutput.Text = 'Browse...'
$btnOutput.Location = New-Object System.Drawing.Point(530, 56)
$btnOutput.Size = New-Object System.Drawing.Size(90, 24)

$lblChunk = New-Object System.Windows.Forms.Label
$lblChunk.Text = 'Games per chunk'
$lblChunk.Location = New-Object System.Drawing.Point(12, 100)
$lblChunk.Size = New-Object System.Drawing.Size(120, 20)

$txtChunk = New-Object System.Windows.Forms.TextBox
$txtChunk.Location = New-Object System.Drawing.Point(140, 98)
$txtChunk.Size = New-Object System.Drawing.Size(100, 20)
$txtChunk.Text = '200'

$lblExtra = New-Object System.Windows.Forms.Label
$lblExtra.Text = 'Extra CLI options'
$lblExtra.Location = New-Object System.Drawing.Point(12, 140)
$lblExtra.Size = New-Object System.Drawing.Size(120, 20)

$txtExtra = New-Object System.Windows.Forms.TextBox
$txtExtra.Location = New-Object System.Drawing.Point(140, 138)
$txtExtra.Size = New-Object System.Drawing.Size(480, 20)

$lblFirstWhiteMove = New-Object System.Windows.Forms.Label
$lblFirstWhiteMove.Text = 'First white move (e.g. d4, e4, Nf3)'
$lblFirstWhiteMove.Location = New-Object System.Drawing.Point(12, 174)
$lblFirstWhiteMove.Size = New-Object System.Drawing.Size(180, 20)

$txtFirstWhiteMove = New-Object System.Windows.Forms.TextBox
$txtFirstWhiteMove.Location = New-Object System.Drawing.Point(200, 172)
$txtFirstWhiteMove.Size = New-Object System.Drawing.Size(420, 20)

$chkDrawOnly = New-Object System.Windows.Forms.CheckBox
$chkDrawOnly.Text = 'Draw only'
$chkDrawOnly.Location = New-Object System.Drawing.Point(140, 206)
$chkDrawOnly.Size = New-Object System.Drawing.Size(120, 20)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = 'Start'
$btnStart.Location = New-Object System.Drawing.Point(430, 254)
$btnStart.Size = New-Object System.Drawing.Size(90, 28)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = 'Cancel'
$btnCancel.Location = New-Object System.Drawing.Point(530, 254)
$btnCancel.Size = New-Object System.Drawing.Size(90, 28)
$btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

$form.AcceptButton = $btnStart
$form.CancelButton = $btnCancel

$openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
$openFileDialog.InitialDirectory = $defaultInputDir
$openFileDialog.Filter = 'PGN files (*.pgn)|*.pgn|All files (*.*)|*.*'
$openFileDialog.Multiselect = $false

$inputFolderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
$inputFolderDialog.SelectedPath = $defaultInputDir

$folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
$folderDialog.SelectedPath = $defaultOutputDir

$btnInput.Add_Click({
  $openFileDialog.InitialDirectory = if ($txtInput.Text) { Split-Path -Parent $txtInput.Text } else { $defaultInputDir }
  if ($openFileDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $txtInput.Text = $openFileDialog.FileName
  }
})

$btnInputFolder.Add_Click({
  if ($txtInput.Text) {
    $inputFolderDialog.SelectedPath = $txtInput.Text
  } else {
    $inputFolderDialog.SelectedPath = $defaultInputDir
  }

  if ($inputFolderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $txtInput.Text = $inputFolderDialog.SelectedPath
  }
})

$btnOutput.Add_Click({
  if ($txtOutput.Text) {
    $folderDialog.SelectedPath = $txtOutput.Text
  } else {
    $folderDialog.SelectedPath = $defaultOutputDir
  }

  if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $txtOutput.Text = $folderDialog.SelectedPath
  }
})

$form.Add_Shown({
  if (-not $txtInput.Text) {
    $btnInput.Focus()
  }
})

$btnStart.Add_Click({
  $inputPath = $txtInput.Text.Trim()
  $outputPath = $txtOutput.Text.Trim()
  $chunkText = $txtChunk.Text.Trim()
  $firstWhiteMove = $txtFirstWhiteMove.Text.Trim()
  $extra = $txtExtra.Text.Trim()

  if (-not $inputPath) {
    Show-Error 'Please choose an input PGN file or folder.'
    return
  }

  if (-not (Test-Path -Path $inputPath -PathType Leaf) -and -not (Test-Path -Path $inputPath -PathType Container)) {
    Show-Error 'Input path not found.'
    return
  }

  if (-not $outputPath) {
    Show-Error 'Please choose an output folder.'
    return
  }

  [int]$chunkValue = 0
  if (-not [int]::TryParse($chunkText, [ref]$chunkValue) -or $chunkValue -lt 1) {
    Show-Error 'Games per chunk must be an integer >= 1.'
    return
  }

  if (-not (Test-Path -Path $runBat -PathType Leaf)) {
    Show-Error "run.bat not found at $runBat"
    return
  }

  if (-not (Test-Path -Path $outputPath -PathType Container)) {
    New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
  }

  $extraSummary = if ($extra) { $extra } else { '(none)' }
  $firstWhiteMoveSummary = if ($firstWhiteMove) { $firstWhiteMove } else { '(none)' }
  $summary = "Input: $inputPath`nOutput: $outputPath`nGames per chunk: $chunkValue`nFirst white move: $firstWhiteMoveSummary`nExtra: $extraSummary"
  $confirm = [System.Windows.Forms.MessageBox]::Show($summary, 'Start sorter64?', [System.Windows.Forms.MessageBoxButtons]::OKCancel, [System.Windows.Forms.MessageBoxIcon]::Question)
  if ($confirm -ne [System.Windows.Forms.DialogResult]::OK) {
    return
  }

  $form.Enabled = $false
  try {
    $inputArg = "--input `"$inputPath`""
    $outputArg = "--out `"$outputPath`""
    $chunkArg = "--games-per-chunk $chunkValue"
    $argString = "$inputArg $outputArg $chunkArg"
    if ($firstWhiteMove) {
      $argString = "$argString --first-white-move `"$firstWhiteMove`""
    }
    if ($chkDrawOnly.Checked) {
      $argString = "$argString --draw-only"
    }
    if ($extra) {
      $argString = "$argString $extra"
    }

    $proc = Start-Process -FilePath $runBat -ArgumentList $argString -NoNewWindow -Wait -PassThru
    $exitCode = $proc.ExitCode

    if ($exitCode -eq 0) {
      $open = [System.Windows.Forms.MessageBox]::Show("Completed successfully.`nExit code: $exitCode`nOpen output folder?", 'sorter64', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Information)
      if ($open -eq [System.Windows.Forms.DialogResult]::Yes) {
        Start-Process -FilePath $outputPath
      }
    } else {
      Show-Info "Process finished with exit code: $exitCode"
    }
  } finally {
    $form.Enabled = $true
  }
})

$form.Controls.AddRange(@(
  $lblInput, $txtInput, $btnInput, $btnInputFolder,
  $lblOutput, $txtOutput, $btnOutput,
  $lblChunk, $txtChunk,
  $lblExtra, $txtExtra,
  $lblFirstWhiteMove, $txtFirstWhiteMove,
  $chkDrawOnly,
  $btnStart, $btnCancel
))

[void]$form.ShowDialog()
