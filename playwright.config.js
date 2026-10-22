import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const executablePath=process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
export default defineConfig({
 testDir:'./tests',fullyParallel:false,workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:5195',viewport:{width:1440,height:1100},launchOptions:{executablePath,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},trace:'retain-on-failure'},
 webServer:{command:'node tests/start-server.mjs --host 127.0.0.1 --port 5195',url:'http://127.0.0.1:5195/api/health',reuseExistingServer:false,env:{NODE_ENV:'test',APP_DATA_DIR:join(tmpdir(),`inkforma-test-${process.pid}`)}},
});
