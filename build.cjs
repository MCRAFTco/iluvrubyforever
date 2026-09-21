'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(root).filter(name=>/\.(mp3|m4a|wav|aac|ogg|flac|webm|mp4)$/i.test(name)&&fs.statSync(path.join(root,name)).isFile());
if(files.length!==1){console.error(files.length?'文件夹里有多段录音。请只保留这次要使用的一段，其余移到别处。':'请先把一段 MP3 或 M4A 录音拖进这个文件夹，再双击生成网页。');process.exit(1);}
// Refuse to proceed when sensitive files have already been tracked.
const cp=require('child_process');
try{const tracked=cp.execFileSync('git',['ls-files','--','.'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\n').filter(Boolean);const allowed=new Set(['index.html','voice.enc','.nojekyll','.gitignore']);if(tracked.some(f=>!allowed.has(f))){console.error('此位置已有其他被 Git 跟踪的文件。请使用新建的空仓库，避免把旧录音或密码一起公开。');process.exit(1);}}catch(e){if(e.code==='ENOENT'){console.error('请先安装并打开 GitHub Desktop。');process.exit(1);}}
const passwordPath=path.join(root,'仅自己保留-密码.txt');
let password;if(fs.existsSync(passwordPath)){password=fs.readFileSync(passwordPath,'utf8').trim();if(!/^[A-Za-z0-9_-]{24}$/.test(password)){console.error('本地密码文件被修改了，请恢复原文件，或把它移走以生成新密码。');process.exit(1);}}else{password=crypto.randomBytes(18).toString('base64url');fs.writeFileSync(passwordPath,password+'\n',{mode:0o600,flag:'wx'});}
const data=fs.readFileSync(path.join(root,files[0]));if(!data.length)throw new Error('录音是空文件。');
const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=crypto.pbkdf2Sync(password,salt,300000,32,'sha256');
const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
const encrypted=Buffer.concat([salt,iv,cipher.update(data),cipher.final(),cipher.getAuthTag()]);
fs.writeFileSync(path.join(root,'_local','voice.enc.tmp'),encrypted);
fs.renameSync(path.join(root,'_local','voice.enc.tmp'),path.join(root,'voice.enc'));
console.log('\n完成！录音已加密，网页已准备好。\n\n密码保存在「仅自己保留-密码.txt」。请私下把密码告诉收信人。\n\n现在回到 GitHub Desktop，提交更改，再点击 Push origin（首次为 Publish repository）。\n原始录音、密码、生成工具均由 .gitignore 排除。\n');
