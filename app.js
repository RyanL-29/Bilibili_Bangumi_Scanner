const async = require('async'),
yargs = require('yargs/yargs'),
{ hideBin } = require('yargs/helpers'),
rp = require('request-promise');

const logger = require('./utility/log'),
store = require('./model/store.model'),
read = require('./model/read.model');



const argv = yargs(hideBin(process.argv))
.usage('Usage: node app.js [options]')
.example('node app.js --f 28230000 --t 28239999 --r -1 --interval 120')
.option('fromMD', {
    type: 'number',
    alias: 'f',
    description: 'from MD (Optional. Default latest DB media_id)'
})
.option('toMD', {
    type: 'number',
    alias: 't',
    description: 'to MD'
})
.option('recursive', {
    type: 'number',
    alias: 'r',
    description: '-1: inifinite loop, If > 1 than n+1 times'
})
.option('multithread', {
    type: 'number',
    // alias: 'mt',
    description: 'parallel request limit default 50'
})
.option('interval', {
    type: 'number',
    // alias: 'intv',
    description: 'minutes default 5 min'
})
.epilog('Bilibili_Bangumi_Scanner || Project ANi')
.demandOption(['t', 'toMD'], 'Please provide both t || toMD arguments to work with this tool')
.help('h')
.alias('h', 'help')
.argv

let fromMD = argv.f || argv.fromMD || null
let toMD = argv.t || argv.toMD || null
let loop = argv.r || argv.recursive || 0
let interval = argv.interval || 3
let multithread = argv.mt || argv.multithread || 50

interval = interval * 60000 
if (!toMD) {
    logger.LogError("Please provide to MD with arg --t <integer> !!")
    process.exit(0);
} else if(fromMD > toMD) {
    logger.LogError("fromMD is larger than toMD ! System will automatically swapping two value")
    let tmpfromMD = fromMD
    fromMD = toMD
    toMD = tmpfromMD
}

const url = 'https://api.bilibili.com/pgc/review/user?media_id=';
const LimitArea = "僅限" 
const grabList = (id, callback) => {
    rp(url + id)
    .then(function(html){
        //success!
        //console.log(html);
        var info = JSON.parse(html)
        if (info.code === 0 && info.result.media.type_name === '番剧') {
            const bangumiInfo = {
                title: info.result.media.title,
                area: info.result.media.areas[0]?.name || '',
                media_id: info.result.media.media_id,
                season_id: info.result.media.season_id,
                limitArea: info.result.media.title.includes(LimitArea) ? "hktwmo" : "china" 
            }
            logger.LogInfo(`Bangumi: ${bangumiInfo.title} MID: ${bangumiInfo.media_id}`)
            store.InsertRecord(bangumiInfo, (err, cb)=> {
                callback(null, bangumiInfo)
            })
        } else {
            callback("not_bangumi")
        }
    }).catch((err) => {
        setTimeout(()=> {
            grabList(id, callback)
        }, 3000)
    })
}

const checkList = () => {  
    read.readCheckLastScan((err, cb) => {
        const set = []
        logger.LogInfo(`Resume Last Check: ${cb.media_id}`)
        for (let step = fromMD || parseInt(cb.media_id); step <= toMD; step++) {
            set.push((callback) => {
                grabList(step, (err , cb) => {
                    callback(null)
                })
            })
        }

        async.parallelLimit(set, multithread,(err, result) => {
            if (err) {
            console.error("err")
            } else {
            logger.LogInfo(`Check Done`)
            }
        })
    })
}

checkList();

setTimeout(() => {
    if (loop < 0) {
        setInterval(() => {
            checkList()
        }, interval)
    } else {
        const worker = setInterval(() => {
            if (interval <= 0) {
                clearInterval(worker)
            }
                checkList()
                loop--;
        }, interval)
    }
}, interval)
