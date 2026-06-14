const {
    app: app,
    BrowserWindow: BrowserWindow,
    Menu: Menu,
    ipcMain: ipcMain,
    dialog: dialog,
  } = require("electron"),
  path = require("path"),
  fs = require("fs"),
  os = require("os"),
  template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("menu-new-project");
          },
        },
        {
          label: "Open Project",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow.webContents.send("menu-open-project");
          },
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow.webContents.send("menu-save");
          },
        },
        { type: "separator" },
        {
          label: "Export Map",
          click: () => {
            mainWindow.webContents.send("menu-export-map");
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "darwin" === process.platform ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+B",
          click: () => {
            mainWindow.webContents.send("toggle-sidebar");
          },
        },
        {
          label: "Toggle Logs Panel",
          accelerator: "CmdOrCtrl+L",
          click: () => {
            mainWindow.webContents.send("toggle-logs");
          },
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          click: () => {
            mainWindow.webContents.send("map-zoom-in");
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            mainWindow.webContents.send("map-zoom-out");
          },
        },
        {
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: () => {
            mainWindow.webContents.send("map-reset-zoom");
          },
        },
        { type: "separator" },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            mainWindow.reload();
          },
        },
        {
          label: "Toggle Developer Tools",
          accelerator:
            "darwin" === process.platform ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: "Settings",
      submenu: [
        {
          label: "Preferences",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow.webContents.send("open-preferences");
          },
        },
        {
          label: "Map Settings",
          click: () => {
            mainWindow.webContents.send("open-map-settings");
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About OmniView",
          click: () => {
            mainWindow.webContents.send("show-about");
          },
        },
        {
          label: "Documentation",
          click: () => {
            require("electron").shell.openExternal(
              "https://github.com/Vinit710/OMNIVIEW"
            );
          },
        },
      ],
    },
  ];
let mainWindow;

// Read a stylesheet relative to this file; returns "" if missing.
function readCss(relPath) {
  try {
    return fs.readFileSync(path.join(__dirname, relPath), "utf8");
  } catch (e) {
    return "";
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[c]);
}

// Render the disaster report (already-built HTML) to a PDF the user chooses a
// location for. Uses an offscreen window + printToPDF so remote analyzed images
// and base64 charts both render correctly.
ipcMain.handle("export-report-pdf", async (event, { html, title }) => {
  if (!html) return { error: "No report content to export" };

  // Reuse the app's own styling so the PDF matches the on-screen report.
  const themeCss = readCss("../renderer/shared/theme.css");
  const disasterCss = readCss("../renderer/screens/disaster/disaster.css").replace(
    /@import\s+url\(["']\.\.\/\.\.\/shared\/theme\.css["']\);?/,
    ""
  );

  const safeTitle = escapeHtml(title || "Disaster Report");
  const generatedOn = new Date().toLocaleString();

  const doc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>${themeCss}${disasterCss}</style>
    <style>
      html, body { overflow: visible !important; height: auto !important; background: #0f1419; }
      body { margin: 0; }
      .pdf-wrap { padding: 32px 36px; background: #0f1419; color: #e2e8f0; }
      .pdf-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
      .pdf-sub { font-size: 12px; color: #94a3b8; margin-bottom: 24px; }
      img { max-width: 100%; }
      .report-chart-card, .ria-card, .report-charts-grid, .report-images-grid { break-inside: avoid; }
      .report-section-heading { break-after: avoid; }
    </style>
  </head>
  <body>
    <div class="pdf-wrap">
      <div class="pdf-title">${safeTitle}</div>
      <div class="pdf-sub">OmniView Disaster Report · Generated ${generatedOn}</div>
      ${html}
    </div>
  </body>
</html>`;

  const tmpFile = path.join(os.tmpdir(), `omniview_report_${Date.now()}.html`);
  let printWin;
  try {
    fs.writeFileSync(tmpFile, doc, "utf8");

    printWin = new BrowserWindow({
      show: false,
      width: 1000,
      height: 1400,
      webPreferences: { offscreen: false },
    });
    await printWin.loadFile(tmpFile);

    // Wait for images (charts + remote photos) to finish loading, capped at 8s.
    await printWin.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const imgs = Array.from(document.images);
        let pending = imgs.filter((i) => !i.complete).length;
        const done = () => { if (--pending <= 0) resolve(); };
        if (pending === 0) return resolve();
        imgs.forEach((i) => {
          if (i.complete) return;
          i.addEventListener("load", done);
          i.addEventListener("error", done);
        });
        setTimeout(resolve, 8000);
      });
    `);

    const safeName = (title || "disaster_report")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "disaster_report";

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save Disaster Report",
      defaultPath: path.join(app.getPath("downloads"), `${safeName}.pdf`),
      filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    const pdfData = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    fs.writeFileSync(filePath, pdfData);

    return { success: true, path: filePath };
  } catch (err) {
    return { error: err.message };
  } finally {
    if (printWin && !printWin.isDestroyed()) printWin.close();
    fs.unlink(tmpFile, () => {});
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "../assets/icon.ico"),
  });

  // Start with splash screen
  mainWindow.loadFile(
    path.join(__dirname, "../renderer/screens/splash/splash.html")
  );

  // After splash screen completes, restore window frame
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  const e = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(e);

  // Add Referer header for OSM tile requests (required by usage policy)
  const { session } = require("electron");
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["https://*.tile.openstreetmap.org/*"] },
    (details, callback) => {
      details.requestHeaders["Referer"] = "https://omniview.app";
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}
(app.whenReady().then(() => {
  (createWindow(),
    app.on("activate", () => {
      0 === BrowserWindow.getAllWindows().length && createWindow();
    }));
}),
  app.on("window-all-closed", () => {
    "darwin" !== process.platform && app.quit();
  }));
