const sqlite3 = require('sqlite3').verbose();

const env = require("../service/env.service"),
logger = require("../utility/log"),
utility = require("../utility/other");

const db = new sqlite3.Database(`${env.getEnvVar("SQLPATH")}`);

class sqliteRead {
    constructor(){}

    readCheckLastScan(callback) {
        db.serialize(function() {
            db.get(`SELECT media_id FROM anime_bilibili_hktwmo ORDER BY media_id DESC LIMIT 1`, (err, cb1) => {
                if(err){logger.LogError(err)}
                if (cb1) {
                    db.get(`SELECT media_id FROM anime_bilibili_china ORDER BY media_id DESC LIMIT 1`, (err, cb2) => {
                        if(err){logger.LogError(err)}
                        if (cb2 && cb1.media_id > cb2.media_id) {
                            callback(null, cb1)
                        } else if (!cb2){
                            callback(null, cb1)
                        } else {
                            callback(null, cb2)
                        }
                    })
                } else {
                    callback(null, {media_id: 0})
                }
            })
        })
    }
}

module.exports = new sqliteRead()