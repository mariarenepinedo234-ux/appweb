import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const executablePath=process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
export default defineConfig({
 testDir:'./tests',fullyParallel:false,workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:5180',viewport:{width:1440,height:1100},launchOptions:{executablePath,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort',url:'http://127.0.0.1:5180',reuseExistingServer:!process.env.CI},
});
