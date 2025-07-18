const cfg = require("./config");
const logger = require("./logger");
const mongoose = require("mongoose");
let MongoData = require("./mongo");
const si = require('systeminformation');
mongoose.connect(cfg.mongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    logger.log("Connected to the Mongodb database.", "log");
    init();
}).catch((err) => {
    logger.log("Unable to connect to the Mongodb database. Error:"+err, "error");
});
const RefreshInterval = 60;
const NetworkManager = require('./network/main')
const networkmngr = new NetworkManager(RefreshInterval);

async function init() {
    const res = await fetch('https://myexternalip.com/raw');
    const ip = await res.text();
    save(ip);
    setInterval(() => save(ip), RefreshInterval * 1000);
}

var GetNetwork = function() {
    return new Promise(resolve => {
        networkmngr.method(response => resolve(response));
    });
}
var save = async function(ip){
    try{
        let data = await MongoData.findOne({ip});
        if(data == null) data = new MongoData({ip});
        if(data.statistics.length >= 1440){
            await MongoData.updateOne({ip}, {$pull: {statistics: {date: data.statistics[0].date}}});
            data = await MongoData.findOne({ip});
        }
        let cpus = [];
        let disks = [];
        const currentLoad = await si.currentLoad();
        const memoryUsage = await si.mem();
        const networkData = await GetNetwork();
        const fsSize = await si.fsSize()
        const time = si.time();
        let memory = `${Math.round(memoryUsage.used/memoryUsage.total*100)}%`;
        currentLoad.cpus.forEach((cpu, i) => {
            let core = i; core++;
            cpus.push({load: `${Math.round(cpu.load)}%`, core})
        });
        fsSize.forEach((disk) => {
            disks.push({load: `${Math.round(disk.use)}%`, name: disk.mount})
        });
        const network = {in:0,out:0};
        if(networkData.filter(x => x.name == 'global').length > 0){
            const _dodata = networkData.find(x => x.name == 'global');
            network.in = parseFloat(_dodata.inbound);
            network.out = parseFloat(_dodata.outbound);
        }
        let date = Date.now();
        data.uptime = time.uptime;
        data.statistics.push({date, cpus, memory, disks, network});
        data.markModified("statistics");
        await data.save();
    }catch(e){logger.log(e, "error")}
}

process.on("unhandledRejection", (err) => logger.log(err, "error"));
process.on("uncaughtException", (err) => logger.log(err, "error"));