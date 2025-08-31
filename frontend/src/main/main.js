const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Create application menu
const template = [
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
        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
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
          process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "../assets/icon.png"),
  });
  mainWindow.loadFile(
    path.join(__dirname, "../renderer/screens/disaster/disaster.html")
  );

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
