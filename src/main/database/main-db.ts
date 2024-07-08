import Database from 'better-sqlite3';
import global from '../../shared/global';
import { TimingRecord, RecordType, Runner } from '../../shared/models';


export function InsertOrUpdateTimingRecord (record: TimingRecord ) {
    let db: Database = global.shared.dbConnection;
    let insert: any, update: any;
    
    let stationID: number = global.shared.myStationID as number;
    let dateISO: string = record.datetime.toISOString();
    let sent: number = 0;

    const query = db.prepare(`SELECT * FROM Runners WHERE bib_id = ?`).get(record.bib);
    if(query?.bib_id == record.bib) {
        switch (record.type) {
            case RecordType.In:{
                update = db.prepare(`UPDATE Runners SET station_id = '${stationID}', time_in = '${dateISO}', last_changed = '${dateISO}' WHERE bib_id = ?`);
                break;
            };
            case RecordType.Out:{
                update = db.prepare(`UPDATE Runners SET station_id = '${stationID}', time_out = '${dateISO}', last_changed = '${dateISO}' WHERE bib_id = ?`);
                break;
            };
            case RecordType.InOut:{
                update = db.prepare(`UPDATE Runners SET station_id = '${stationID}', time_in = '${dateISO}', time_out = '${dateISO}', last_changed = '${dateISO}' WHERE bib_id = ?`);
                break;
            };
        }
        update.run(record.bib);
    }
    else {
        insert = db.prepare(`INSERT INTO Runners (bib_id, station_id, time_in, time_out, last_changed, sent) VALUES (?, ?, ?, ?, ?, ?)`);

        switch (record.type) {
            case RecordType.In:{ insert.run(record.bib, stationID, dateISO, null, dateISO, sent); break;}
            case RecordType.Out:{ insert.run(record.bib, stationID, null, dateISO, dateISO, sent); break; };
            case RecordType.InOut:{ insert.run(record.bib, stationID, dateISO, dateISO, dateISO, sent); break; };
        }
    }
}

export function LookupStartListRunnerByBib( bibNumber: number): [Runner | undefined, string] {
    let db: Database = global.shared.dbConnection;
   
    let result: string;
    let runner: Runner;

    try{
        const startListRunner = db.prepare(`SELECT * FROM StartList WHERE Bib = ?`).get(bibNumber);
        
        // neither of these checks seem to work that well
        if(startListRunner.Bib === undefined)
            return [undefined, `bad value for index ${bibNumber}`];

        if(typeof startListRunner.Bib !== 'number') {
            return [undefined, `Bib #${bibNumber} not found!`];
        };

        runner = {
            index: startListRunner.index,
            bib: startListRunner.Bib,
            firstname: startListRunner.FirstName,
            lastname: startListRunner.LastName,
            gender: startListRunner.gender,
            age: startListRunner.Age,
            city: startListRunner.City,
            state: startListRunner.State,
            emPhone: startListRunner.EmergencyPhone,
            emName: startListRunner.EmergencyName,
            dns: undefined,
            dnf: undefined,
            dnfStation: undefined,
            dnfDateTime: undefined
        }

        result = `Found #${startListRunner.Bib} ${startListRunner.FirstName} ${startListRunner.LastName} ${startListRunner.City}`;
        return [runner, result];
    }
    catch(e: any){
        result = e.message; 
        return [undefined, result];
    }
}