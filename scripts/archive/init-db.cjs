const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'public', 'data', 'f1.db');
const db = new Database(dbPath);

// 创建driver_photos表
db.exec(`
  CREATE TABLE IF NOT EXISTS driver_photos (
    code TEXT PRIMARY KEY,
    url TEXT
  )
`);

// 创建team_photos表
db.exec(`
  CREATE TABLE IF NOT EXISTS team_photos (
    team TEXT PRIMARY KEY,
    url TEXT
  )
`);

// 创建schedule表
db.exec(`
  CREATE TABLE IF NOT EXISTS schedule (
    url TEXT PRIMARY KEY,
    date TEXT,
    circuit TEXT
  )
`);

// 导入driverPhotos.json
const driverPhotosData = require('./src/data/driverPhotos.json');
const insertDriver = db.prepare('INSERT OR REPLACE INTO driver_photos (code, url) VALUES (?, ?)');
driverPhotosData.forEach(item => {
  insertDriver.run(item['缩写'], item['网址']);
});
console.log(`导入 ${driverPhotosData.length} 条车手照片数据`);

// 导入teamPhotos.json
const teamPhotosData = require('./src/data/teamPhotos.json');
const insertTeam = db.prepare('INSERT OR REPLACE INTO team_photos (team, url) VALUES (?, ?)');
teamPhotosData.forEach(item => {
  insertTeam.run(item['车队'], item['网址']);
});
console.log(`导入 ${teamPhotosData.length} 条车队照片数据`);

// 导入schedule.json
const scheduleData = require('./src/data/schedule.json');
const insertSchedule = db.prepare('INSERT OR REPLACE INTO schedule (url, date, circuit) VALUES (?, ?, ?)');
scheduleData.forEach(item => {
  insertSchedule.run(item['url'], item['date'], item['circuit']);
});
console.log(`导入 ${scheduleData.length} 条赛程数据`);

// 验证结果
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('当前数据库表:', tables.map(t => t.name));

db.close();
console.log('数据库初始化完成！');
