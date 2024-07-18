import Database from 'better-sqlite3';
import global from '../../shared/global';
import { Runner } from '../../shared/models';
import fs from 'fs';

export function ConnectToDB () {
    let db: Database;
    let dbPath = global.shared.dbPath;
    let dbFullPath = global.shared.dbFullPath;

    if (fs.existsSync(dbPath)) {
        db = global.shared.dbConnection = new Database(dbFullPath);
        db.pragma('journal_mode = WAL');
        console.log('Connected to SQLite Database: ' + dbFullPath);
    }
    else {
        db = global.shared.dbConnection = new Database(dbFullPath);
        db.pragma('journal_mode = WAL');
        console.log('Created local SQLite Database: ' + dbFullPath);

        CreateTables();
    }
}

export function ReadStartListRunnerByBib( bibNumber: number): [Runner | undefined, string] {
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
            dns: false,
            dnf: false,
            dnfStation: 1,
            // dnfDateTime: undefined
        }

        result = `Found #${startListRunner.Bib} ${startListRunner.FirstName} ${startListRunner.LastName} ${startListRunner.City}`;
        return [runner, result];
    }
    catch(e: any){
        result = e.message; 
        return [undefined, result];
    }
}

export function CreateTables( ): string{
    let db: Database = global.shared.dbConnection;
    let result: string;
    let CmdResult: string;

    //Create each of the tables
    try{
        CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Runners (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bib_id INTEGER DEFAULT (0),
        station_id INTEGER,
        time_in DATETIME,
        time_out DATETIME,
        last_changed TEXT,
        sent BOOLEAN DEFAULT (FALSE))`);
        
        result = db.exec();
    }
    catch(e: any){
        result = e.message; 
        return result;
    }

    //Create Events table
    try{
        CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Events (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bib_id INTEGER DEFAULT (0),
        station_id INTEGER,
        time_in DATETIME,
        time_out DATETIME,
        last_changed TEXT,
        sent BOOLEAN DEFAULT (FALSE))`);
        
        result = db.exec();
    }
    catch(e: any){
        result = e.message; 
        return result;
    }

    //Create StartList table
    try{
        CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS StartList (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        Bib INTEGER DEFAULT (0),
        FirstName TEXT,
        LastName TEXT,
        gender TEXT,
        Age INTEGER DEFAULT (0),
        City TEXT,
        State TEXT,
        EmergencyPhone INTEGER,
        EmergencyName TEXT`);
        
        result = db.exec();
   }
    catch(e: any){
        result = e.message; 
        return result;
    }

    //Create Stations table
    try{
        CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Stations (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        StaName TEXT,
        Last_changed DATETIME`);
        
        result = db.exec();
    }
    catch(e: any){
        result = e.message; 
        return result;
    }

    //Create Output table
    try{
        CmdResult = db.prepare(`CREATE TABLE IF NOT EXISTS Output (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        Bib INTEGER DEFAULT (0),
        Sta1_in DATETIME,
        Sta1_out DATETIME,
        Sta2_in DATETIME,
        Sta2_out DATETIME,
        Sta3_in DATETIME,
        Sta3_out DATETIME,
        Sta4_in DATETIME,
        Sta4_out DATETIME,
        Sta5_in DATETIME,
        Sta5_out DATETIME,
        Sta6_in DATETIME,
        Sta6_out DATETIME,
        Sta7_in DATETIME,
        Sta7_out DATETIME,
        Sta8_in DATETIME,
        Sta8_out DATETIME,
        Sta9_in DATETIME,
        Sta9_out DATETIME,
        Sta10_in DATETIME,
        Sta10_out DATETIME,
        Sta11_in DATETIME,
        Sta11_out DATETIME,
        Sta12_in DATETIME,
        Sta12_out DATETIME,
        Sta13_in DATETIME,
        Sta13_out DATETIME,
        Sta14_in DATETIME,
        Sta14_out DATETIME,
        Sta15_in DATETIME,
        Sta15_out DATETIME,
        Sta16_in DATETIME,
        Sta16_out DATETIME,
        Sta17_in DATETIME,
        Sta17_out DATETIME,
        Sta18_in DATETIME,
        Sta18_out DATETIME,
        Sta19_in DATETIME,
        Sta19_out DATETIME,
        Sta20_in DATETIME,
        Sta20_out DATETIME,
        Dnf BOOLEAN,
        Dns BOOLEAN,
        Last_changed DATETIME`);
        
        result = db.exec();
    }
    catch(e: any){
        result = e.message; 
        return result;
    }

    return result;
}

export function ClearStartListTable( ): boolean{
    let db: Database = global.shared.dbConnection;
    let CmdResult: string;   
    let result: boolean;

    try{
        CmdResult = db.prepare(`DELETE * FROM StartList`);
        result = db.exec();
        return result;
    }
    catch(e: any){
        result = e.message; 
        return false;
    }
}

export function ClearEventsTable( ): boolean{
    let db: Database = global.shared.dbConnection;
    let CmdResult: string;
    let result: boolean;

    try{
        CmdResult = db.prepare(`DELETE * FROM Events`);
        result = db.exec();
        
        result = true;
        return result;
    }
    catch(e: any){
        result = e.message; 
        return false;
    }
}

export function ClearRunnersTable( ): boolean{
    let db: Database = global.shared.dbConnection;
    let CmdResult: string;
    let result: boolean;
    try{
        CmdResult = db.prepare(`DELETE * FROM Runners`);
            result = db.exec();
            return result;
        }
        catch(e: any){
            result = e.message; 
            return false;
        }
}

export function ClearStationsTable( ): boolean{
    let db: Database = global.shared.dbConnection;
    let CmdResult: string;
    // let result: boolean;

    try{
        CmdResult = db.prepare(`DELETE * FROM Stations`);
        CmdResult = db.exec();
        return true;
    }
    catch(e: any){
        result = e.message; 
        return false;
    }
}  

export function ClearOutputTable( ): boolean{
    let db: Database = global.shared.dbConnection;
    let CmdResult: string;
     let result: string;

    try{
        CmdResult = db.prepare(`DELETE * FROM Output`);
        result = db.exec();
        return true;
    }
    catch(e: any){
        result = e.message; 
        return false;
    }    
}