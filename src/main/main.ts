import path from 'path';
import {app, BrowserWindow, shell} from 'electron';
import MenuBuilder from './menu';
import {resolveHtmlPath} from './util';
import {ChatManager} from './state/ChatManager';
import {ConnectionManager} from "./state/ConnectionManager";
import {ProfileManager} from "./state/ProfileManager";
import {AutoUpdateManager} from "./state/AutoUpdateManager";
import {AppManager} from "./state/AppManager";
import {SettingsManager} from "./state/SettingsManager";
import {NoticeManager} from "./state/NoticeManager";
import * as Sentry from "@sentry/electron";

AppManager.initialize()
AutoUpdateManager.initialize()
ConnectionManager.initialize()
NoticeManager.initialize()
ChatManager.initialize()
ProfileManager.initialize()
SettingsManager.initialize()

Sentry.init({
    dsn: "https://fe2a46d485b04e8691f0bf496cc44646@o4504454868369408.ingest.sentry.io/4504454870728704"
});
Sentry.setUser({
    id: AppManager.getIdentifier(),
    username: ProfileManager.getProfile().username
})

export let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
    require('electron-debug')();
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS'];

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload
        )
        .catch(console.log);
};

const createWindow = async () => {
    // if (isDebug) {
    //     try {
    //         await installExtensions();
    //     } catch (error) {
    //         console.log('Failed to install extensions:', error);
    //     }
    // }

    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths);
    };

    mainWindow = new BrowserWindow({
        show: false,
        width: 1024,
        height: 728,
        // icon: getAssetPath('icon.png'),
        icon: getAssetPath('logos/icon.png'),
        webPreferences: {
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
    });

    mainWindow.loadURL(resolveHtmlPath('index.html'));

    mainWindow.on('ready-to-show', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMenu();

    mainWindow.webContents.setWindowOpenHandler((edata) => {
        shell.openExternal(edata.url);
        return {action: 'deny'};
    });
};

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app
    .whenReady()
    .then(() => {
        createWindow();
        app.on('activate', () => {
            if (mainWindow === null) createWindow();
        });
    })
    .catch(console.log);
