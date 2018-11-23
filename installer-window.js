const electronInstaller = require('electron-winstaller');

const resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './window/compression-win32-x64', // electron-packgager로 생성한 폴더
    outputDirectory: './window/compression-win32-x64', 
    authors: 'My App Inc.',
    exe: 'compression.exe', // electron-packgager로 생성한 폴더안에 exe파일
    description: 'j'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));