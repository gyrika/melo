; Melo POS (the Station): one Setup.exe that puts the whole POS on a shop PC.
; Its own AppId, so it never installs over another program.
; Built by GitHub (.github/workflows/station.yml) from deploy/station/stage/ (see stage.ps1):
;   iscc /DAppVersion=1.2.3 MeloPOS.iss
; Everything it needs is inside: its own Node.js, the POS, the built-in database. The shop's
; data lives in C:\ProgramData\MeloPOS and is never touched by an update or an uninstall.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
; iscc /DOffline ...: the offline Setup.exe, for a PC without internet. It also carries Microsoft's
; WebView2 (the counter app's web engine, ~200 MB), so it is a separate download: updates keep using
; the small one (station-update.ps1 looks only for MeloPOS-Setup-*.exe).
#ifdef Offline
  #define SetupName "MeloPOS-Offline-Setup-" + AppVersion
#else
  #define SetupName "MeloPOS-Setup-" + AppVersion
#endif

[Setup]
AppId={{A9657C62-C040-408D-B013-54B2DCE13B01}
AppName=Melo POS
AppVersion={#AppVersion}
AppVerName=Melo POS {#AppVersion}
AppPublisher=Melo
AppPublisherURL=https://github.com/gyrika/melo
DefaultDirName={autopf}\Melo POS
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Windows 10 version 2004 or newer, or Windows 11: the oldest Windows the bundled Node.js, .NET 4.8
; and WebView2 are all tested on (station.yml). Older PCs get a clear message instead of a POS that
; installs and then does not start.
MinVersion=10.0.19041
WizardStyle=modern
; The Melo POS honeycomb on the Setup.exe file, its pages, and in Windows' list of programs
; (pictures drawn by scripts/make-icons.mjs).
SetupIconFile=pos-app\app.ico
WizardImageFile=wizard.bmp,wizard-2x.bmp
WizardSmallImageFile=wizard-small.bmp,wizard-small-2x.bmp
UninstallDisplayIcon={app}\pos-app\MeloPOS.exe
OutputDir=Output
OutputBaseFilename={#SetupName}
Compression=lzma2/max
SolidCompression=yes
UninstallDisplayName=Melo POS
CloseApplications=no
; Never ask to restart Windows: a shop's counter PC cannot be restarted mid-day (owner, 2026-10-30).
RestartIfNeededByRun=no

[Messages]
WelcomeLabel1=Welcome to Melo POS
WelcomeLabel2=This puts Melo POS on this computer: the counter, the kitchen screen and everything they need.%n%nIt takes about a minute. Then the POS opens and asks a few questions about your shop.
FinishedHeadingLabel=Melo POS is ready
FinishedLabel=The POS starts by itself whenever this computer starts.
WinVersionTooLowError=Melo POS needs Windows 10 (version 2004 or newer) or Windows 11, 64-bit. Please update Windows first.

[Dirs]
Name: "{commonappdata}\MeloPOS"

[Files]
Source: "stage\node\node.exe"; DestDir: "{app}\node"; Flags: ignoreversion
Source: "stage\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
; The counter app is usually running during an update, which locks its files. Setup run by hand closes it
; first (PrepareToInstall) and opens it again at the end, so nothing waits for a restart. The silent nightly
; update leaves it open: then its files are replaced at the next restart (restartreplace), without asking.
; The POS screens come from the server, so they update at once either way.
Source: "stage\pos-app\*"; DestDir: "{app}\pos-app"; Flags: ignoreversion recursesubdirs createallsubdirs restartreplace
Source: "station.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "station-install.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "station-uninstall.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "station-update.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "station-support.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "stage\version.txt"; DestDir: "{app}"; Flags: ignoreversion
#ifdef Offline
Source: "stage\webview2\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif

[Icons]
; The counter's app (a real Windows program, not a browser): its own icon, full screen.
Name: "{commondesktop}\Melo POS"; Filename: "{app}\pos-app\MeloPOS.exe"; WorkingDir: "{app}\pos-app"
Name: "{autoprograms}\Melo POS"; Filename: "{app}\pos-app\MeloPOS.exe"; WorkingDir: "{app}\pos-app"
; When the POS will not open: the support file to send to whoever looks after it (server/supportFile.ts).
Name: "{autoprograms}\Melo POS support file"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\station-support.ps1"""; IconFilename: "{app}\pos-app\MeloPOS.exe"
; Whoever logs in to Windows at the counter gets the POS.
Name: "{commonstartup}\Melo POS"; Filename: "{app}\pos-app\MeloPOS.exe"; WorkingDir: "{app}\pos-app"

[Run]
#ifdef Offline
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\station-install.ps1"" -WebView2Setup ""{tmp}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"""; Flags: runhidden waituntilterminated; StatusMsg: "Starting Melo POS..."
#else
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\station-install.ps1"""; Flags: runhidden waituntilterminated; StatusMsg: "Starting Melo POS..."
#endif
Filename: "{app}\pos-app\MeloPOS.exe"; Description: "Open Melo POS now"; Flags: postinstall nowait skipifsilent runasoriginaluser

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\station-uninstall.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "StopStation"

[Code]
// Before files are replaced (an update): stop the running server, so nothing is locked. Run by hand,
// also close the counter app (it opens again at the end), so Windows never needs a restart for its files.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  if not WizardSilent then
    Exec('powershell.exe', '-NoProfile -Command "Get-Process MeloPOS -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ''' +
      ExpandConstant('{app}') + '*'' } | Stop-Process -Force; Start-Sleep -Milliseconds 500"', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Exec(ExpandConstant('{sys}\schtasks.exe'), '/End /TN "Melo POS"', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Exec('powershell.exe', '-NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ''' +
    ExpandConstant('{app}') + '*'' } | Stop-Process -Force"', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;
