import Database from 'better-sqlite3';
import global from '../../shared/global';
import { Runner } from '../../shared/models';


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