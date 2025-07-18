const os = require('os')
const IfConfigNetwork = require('./ifconfig')
const IPNetwork = require('./ip')
const logger = require("../logger");
module.exports = class NetworkManager {
    constructor(refresh) {
        this.lastRequested = Date.now();
        this.refreshInterval = refresh;
        this.interfaceNames = Object.keys(os.networkInterfaces())
            .filter(networkName => networkName !== 'lo')
        this.cache = []
        const ifConfigInstance = new IfConfigNetwork()
        const ifConfigFetch = ifConfigInstance.fetch.bind(ifConfigInstance)
        const ipInstance = new IPNetwork()
        const ipFetch = ipInstance.fetch.bind(ipInstance)
        ifConfigFetch(err => {
            if (err) {
                return ipFetch(err => {
                    if (err) return logger.log('No network tool found to parse network data, stopping network monitoring', "error");
                    logger.log('Using "ip" as backend for network metrics', "debug");
                    this.method = this.fetch.bind(this, ipFetch)
                })
            }
            logger.log('Using "ifconfig" as backend for network metrics', "debug");
            this.method = this.fetch.bind(this, ifConfigFetch)
        })
    }

    fetch(fetchImpl, cb) {
        fetchImpl((err, interfaces) => {
            if (err){
                cb(null);
                return logger.log(`Error while fetching network stats: ${err}`, "warn");
            }
            interfaces = interfaces.filter(networkInterface => {
                return this.interfaceNames.indexOf(networkInterface.name) > -1;
            })
            if (interfaces.length > 0) {
                interfaces.push({
                    name: 'global',
                    inbound: interfaces.reduce((agg, netowrkInterface) => {
                        agg += netowrkInterface.inbound
                        return agg
                    }, 0),
                    outbound: interfaces.reduce((agg, netowrkInterface) => {
                        agg += netowrkInterface.outbound
                        return agg
                    }, 0)
                })
            }
            
            const req = (Date.now() - this.lastRequested) / 1000;
            this.lastRequested = Date.now();

            const values = interfaces.map(networkInterface => {
                const oldValues = this.cache
                    .find(oldInterfaceValue => oldInterfaceValue.name === networkInterface.name)
                if (oldValues === null | oldValues === undefined) {
                    return {
                        name: networkInterface.name,
                        inbound: 0,
                        outbound: 0
                    }
                }
                return {
                    name: networkInterface.name,
                    inbound: (((networkInterface.inbound - oldValues.inbound) / req) / 1000000).toFixed(2),
                    outbound: (((networkInterface.outbound - oldValues.outbound) / req) / 1000000).toFixed(2)
                }
            })
            this.cache = interfaces;
            return cb(values);
        })
    }
}