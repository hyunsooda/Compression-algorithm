const electron = require('electron');
const path = require('path');
const url = require('url');
const compress = require('./main'); // 압축알고리즘 메인파일


// SET ENV
process.env.NODE_ENV = 'development';

const {app, BrowserWindow, Menu, ipcMain} = electron;

let mainWindow;


// Listen for app to be ready
app.on('ready', function(){
  // Create new window
  mainWindow = new BrowserWindow({});
  // Load html in window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'mainWindow.html'),
    protocol: 'file:',
    slashes:true
  }));
  // Quit app when closed
  mainWindow.on('closed', function(){
    app.quit();
  });

  mainWindow.webContents.on('will-navigate', (event, path) => {
    let p = path.split('/');
    event.preventDefault();
    compress(p[p.length-1]);
  });


  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

function createWindow() {
    addWindow = new BrowserWindow({
        width: 300,
        height:200,
        title:'About Program'
    });
    addWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'subWindow.html'),
        protocol: 'file:',
        slashes:true
    }));
    addWindow.on('close', function(){
        addWindow = null;
    });
}

// Create menu template
const mainMenuTemplate =  [
  // Each object is a dropdown
  {
    label: 'Info',
    submenu:[
      {
        label:'About Developer',
        click() {
            createWindow();
        }
      },
      {
        label: 'Quit',
        accelerator:process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click(){
          app.quit();
        }
      }
    ]
  }
];

// If OSX, add empty object to menu
if(process.platform == 'darwin'){
  mainMenuTemplate.unshift({});
}

// Add developer tools option if in dev
if(process.env.NODE_ENV !== 'production'){
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu:[
      {
        role: 'reload'
      },
      {
        label: 'Toggle DevTools',
        accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow){
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}