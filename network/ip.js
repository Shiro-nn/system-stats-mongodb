const exec = require('./exec')
module.exports = class IPNetwork {
    fetch(cb) {
        exec('ip -s link', function (err, out) {
            if (err) return cb(err)

            const names = new RegExp(/[0-9]+: ([\S]+): /g)
            const RX = new RegExp(/RX:(([a-zA-Z0-9]|\s)+?)\s*\n\s*([0-9]+)/g)
            const TX = new RegExp(/TX:(([a-zA-Z0-9]|\s)+?)\s*\n\s*([0-9]+)/g)

            let interfaces = []
            let i = 0
            let res = null

            while ((res = names.exec(out)) !== null) {
                interfaces.push({
                    name: res[1]
                })
            }

            i = 0
            while ((res = RX.exec(out)) !== null) {
                interfaces[i++].inbound = parseInt(res[3])
            }
            i = 0
            while ((res = TX.exec(out)) !== null) {
                interfaces[i++].outbound = parseInt(res[3])
            }

            interfaces = interfaces.filter(netInterface => {
                return netInterface.name && typeof netInterface.inbound === 'number' &&
                    typeof netInterface.outbound === 'number'
            })
            return cb(null, interfaces)
        })
    }
}