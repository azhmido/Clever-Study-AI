import fs from 'fs';
import path from 'path';

const walkSync = (dir: string, filelist: string[] = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.tsx') || dirFile.endsWith('.css') || dirFile.endsWith('.ts')) {
      filelist.push(dirFile);
    }
  }
  return filelist;
};

const files = walkSync('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Fix text size corruption
  content = content.replace(/text-blue-400ase/g, 'text-base');
  content = content.replace(/text-blue-400xl/g, 'text-5xl');
  content = content.replace(/text-blue-200xl/g, 'text-5xl');
  content = content.replace(/text-blue-400lue-300/g, 'text-blue-300');
  content = content.replace(/text-blue-200lue-300/g, 'text-blue-300');
  
  // Fix remaining old green/brown colors that made muddy background
  content = content.replace(/#244820/gi, '#1e293b'); // Dark Slate
  content = content.replace(/#122410/gi, '#0f172a'); // Very Dark Slate
  
  // Fix index.css (glass-card overlay that was 80% white!)
  if (file.endsWith('index.css')) {
    content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.8\);/g, 'background: rgba(30, 41, 59, 0.4);');
    content = content.replace(/backdrop-filter:\s*blur\(10px\);/g, 'backdrop-filter: blur(20px);');
    content = content.replace(/border:\s*1px\s*solid\s*rgba\(166,\s*123,\s*91,\s*0\.15\);/g, 'border: 1px solid rgba(255, 255, 255, 0.08);');
    content = content.replace(/box-shadow:\s*0\s*10px\s*30px\s*-10px\s*rgba\(45,\s*90,\s*39,\s*0\.15\);/g, 'box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);');
  }

  // To make stat cards look clearly good instead of FBBF24 on Slate
  content = content.replace(/text-\[\#FBBF24\] mt-1/g, 'text-slate-400 mt-1');
  
  // The numbers themselves
  content = content.replace(/text-\[\#F8FAFC\]/g, 'text-white');
  
  fs.writeFileSync(file, content);
});
console.log('Fixed');
