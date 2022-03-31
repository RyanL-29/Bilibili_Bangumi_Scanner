const sqlite3 = require('sqlite3').verbose(),
axios = require("axios");

const env = require("../service/env.service"),
logger = require("../utility/log"),
utility = require("../utility/other");

const db = new sqlite3.Database(`${env.getEnvVar("SQLPATH")}`);
const discordWebhook = ""

class sqliteStore {
    constructor(){}

    sendToDiscord(content) {        
        axios.post(discordWebhook, {
            content: content
        })
    }

    InsertRecord(info, callback) {
        const that = this;
        db.serialize(function() {
            db.get(`SELECT * FROM anime_bilibili_${info.limitArea} WHERE media_id = "${info.media_id}"`, (err, cb) => {
                if (err) {logger.LogError(err)}
                if (!cb) {
                    logger.LogInfo(`[DB]Insert=> ${info.title} area=${info.area} media_id=${info.media_id} season_id=${info.season_id}`)  
                    var query = db.prepare(`INSERT INTO anime_bilibili_${info.limitArea} (title, area, media_id, season_id) VALUES (?, ?, ?, ?)`)
                    query.run(info.title, info.area, info.media_id, info.season_id)
                    query.finalize();
                    that.sendToDiscord(`${info.title} area=${info.area} media_id=${info.media_id} season_id=${info.season_id}`);
                    callback(null)
                }
                else if (cb.title === info.title && cb.area === info.area && parseInt(cb.season_id) === info.season_id){
                    //logger.LogInfo(`[DB]Skip=> ${info.title} area=${info.area} media_id=${info.media_id} season_id=${info.season_id} skip`)
                    callback(null)
                }
                else if (cb.title !== info.title) {
                    logger.LogInfo(`[DB]Update: ${cb.title}=>${info.title} area=${info.area} media_id=${info.media_id} season_id=${info.season_id} Contain Same media_id || ID=${info.media_id}`)
                    var query = db.prepare(`UPDATE anime_bilibili_${info.limitArea} SET title = ? WHERE media_id = ?`)
                    that.sendToDiscord(`${cb.title}=>${info.title} area=${info.area} media_id=${info.media_id} season_id=${info.season_id}`);
                    query.run(info.title, info.media_id)
                    query.finalize();
                    callback(null)
                }
                else {
                    callback(null)
                }
            })
        })
    }
}

module.exports = new sqliteStore()