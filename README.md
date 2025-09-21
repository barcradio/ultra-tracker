
![image](https://github.com/user-attachments/assets/f1d4e7a5-e90b-471c-9137-1f1022d9e1f9)

An app for tracking athletes during ultra marathons.

An Electron application with React and TypeScript for Windows, Linux, and MacOS.

---
## Initial Setup
<img width="224" height="48" alt="image" src="https://github.com/user-attachments/assets/edb8ef37-8053-40b0-abf4-f2e8859d86be" />

1. Copy the event files into the event-configs folder:  
   1. `\Documents\Ultra-Tracker\.event-config\`
2. Load the Stations file
   1. Select Station location and set operator call sign
3. Load the Athletes file
4. Load the Did Not Start (DNS) File
5. Load the most recent Did Not Finish (DNF) file
6. Go to stats screen and begin logging athletes

## Navigation Sidebar
The left side bar is used to select different pages.  Select from Stats, Roster, Logs, Export, Theme, Database, Settings and Help. Hovering over the sidebar area will expand it to show the names.

## Stats Page
<img alt="image" src="https://github.com/user-attachments/assets/c4eb6caf-7fbf-42e5-a8b2-bc8f34986fd3" />

The **BIB#** box is the main starting point for using this page. This input control will accept numerical input, either from the 10-key pad or top-row keys of all standard keyboards.  See useful keyboard shortcuts below.

Clicking the In button and Out button will record the corresponding time entry.

The datagrid columns can be Sorted by clicking on the column header.  Click again to toggle Ascending or Descending Sort. 

A Filter control for any column can be opened by clicking the Filter icon (three vertical dots).

> [!WARNING]
> If the horizontal width of the Ultra-Tracker window is too small, the column filter buttons can overlap the column headers and cause the Sort and Filter features difficult to use.  The default layout has been carefully adjusted for modern HD resolutions but display scaling or screen resolution settings in the operating system can make the display too small to fit the default size of Ultra-Tracker.  Adjusting these settings will resolve this on most computers.

### Editing a record
<img width="350" alt="image" src="https://github.com/user-attachments/assets/d81b847b-f2f5-4c99-98e0-0b84d1112be2" />

To edit a timing record, click on the icon at the far-right side of the record row.

The Edit pane allows modification or deletion of a timing record.  The In and Out times, DNF and DNS status, and any notes that have been entered will be displayed.  Changes to these fields must be applied to take effect, or cancelled to return to the Stats page.

If the Bib# can be matched with known athlete, the athlete's name will be displayed.  The button above the name will jump to that athlete in the Roster page.  A timing record for an unknown athlete is considered a warning condition, as all athletes should be known and checked in at the Start of the event, and included in the Athletes file. For a timing record not matched to athlete, limited changes can be performed, resolve the Bib# to a known athlete to modify all values.

> [!CAUTION]
> Deleting a time record is permanent. An entry to the Log page is recorded for reference.

Validation Rules: 
* A record must have an In time.
* An In time must occur before the Out time.
* Commas are not allowed in the Note field, and will be replaced with semi-colons.

### Athlete and Station stats
<img width="266" height="431" alt="image" src="https://github.com/user-attachments/assets/df03ef51-32fd-4e44-9e74-363c35a71318" />

Each of the different statistics available are updated in real-time.

> [!WARNING]
> Warnings should be of interest to the station.

> [!CAUTION]
> Errors should be resolved before sending data to race organizers.

### Keyboard shortcuts
Entry of numbers and times is assisted by using some specific keys on both an 88 key (or more) keyboard or a 10-key Numpad. When the cursor is focused in the **Bib#** box, entering a bib number and pressing one of these keys will automatically enter the record and populate the corresponding time.

*10-key entry is recommended for all stations, for laptops without, use a USB 10-key peripheral.*

> | <div style="width:150px;fontSize:larger">**In**</div> | <div style="width:150px;fontSize:larger">**Out**</div> | <div style="width:150px;fontSize:larger">**In and Out**</div> |
> | :------------- | :---------------- | :-------------- |
> | [Equal]        | [Minus]           | [Slash]         |
> | [Enter]        | [Numpad-Subtract] | [Backslash]     |
> | [Numpad-Add]   |                   | [Numpad-Divide] |
> | [Numpad-Enter] |                   |                 |

<img alt="image" src="https://github.com/user-attachments/assets/7a1fee59-e37a-47c4-b3ff-12fd2315c35e" />


## Roster Page
<img width="224" height="48" alt="image" src="https://github.com/user-attachments/assets/e9a99652-e365-43c4-8b86-b025ba020ecb" />

This page provides the list of all athletes and enable the operator to search for an athlete using different search keys, such as, name, bib number, city, start time, Station TimeIn, Station TimeOut and note entries.

The Status column helps station operators determine which athletes are pertinent to the station.  Valid filter options for the Status column are: `Incoming, DNS, In, Out, Medical, Timeout, Withdrew`

## Stations Page
<img width="210" height="46" alt="image" src="https://github.com/user-attachments/assets/0ad0ad0c-40a8-47c4-97f5-ace3e1178685" />

This page is used to select the Station name and operator callsign.  The callsign selection is currently superficial, and is populated by the metadata in the Stations file and cannot be modified during an event.

This page also shows the details about the aid stations throughout the race, location, mileage, cutoff times.

## Logs Page
<img width="231" height="51" alt="image" src="https://github.com/user-attachments/assets/956162cf-1195-40ff-9124-37b872e25c85" />

This page displays the station log file that is auto-generated during station operation. There are two versions of the log that can be viewed and/or exported for the use of operators or developers to aid in fixing errors that may occur due to programming mistakes or unforeseen situations.

- The normal station log contains entries that occur during regular use and typical data gathering operations. This view may be used by operators to get a detailed understanding of where data errors may have been introduced, such as duplicate timing records.
- The verbose station log is a saved file that contains all events that occurred as well as debug messages designed to assist Ultra-Tracker developers to locate problems that occur during an event. This can be large and should be sent to the developers only upon request.

## Export Page
<img width="218" height="50" alt="image" src="https://github.com/user-attachments/assets/b939c800-1a9f-4b81-9e2a-f44c87111278" />

This page provides Export utilities for sending station data to another station or race organizers.  These file formats are optimized for human and machine readability.

- **Export Incremental CSV File**
This function exports a `.csv` file of the station entries containing unsent or edited records, contains BibID, TimeIn, TimeOut, DNF/DNS status and any notes made by the operator.  The exported file will be automatically named and  incremented. e.g. `Aid05Times_04i.csv, Aid05Times_05i.csv, and Aid05Times_06i.csv`.

  Sending recent time records in smaller batches allows for much smaller files being routinely sent to race leadership to import to the race timing site, whether by packet radio or internet. This keeps timing data updated timely for athlete support crews and other situation in an event.  Depending on the rate of athletes arriving and departing a station, sending an incremental file _every 30 minutes at a minimim_ is recommended, more often if possible.
  
  A station setup with a data entry PC networked to a data transmission PC is recommended so interruption of data entry is limited to a quick Incremental Export operation.  This allows the data transmission operator to access the exported files independently.

  > [!CAUTION]
  > All Incremental files must be transmitted to the race leadership as each file only contains a portion of the overall station data.
  

- **Export Full CSV File**
This function exports a full `.csv` file of **all time records** containing TimeIn, TimeOut, DNF/DNS status and any notes made by the station operators.

This file is useful as a final station report.

- **Export DNS File**
This function exports a `.csv` file with all DNS entries that have occurred at the current station.  This is unlikely to be used at any station other than the Start Line.

- **Export DNF File**
This function exports a `.csv` file with all DNF entries that have occurred up the current station.  This file is not normally needed to be sent to race organizers but can be an efficient way of sending the current station's DNF list to another station.


## Theme Page
<img width="224" height="48" alt="image" src="https://github.com/user-attachments/assets/37b36db6-84dd-468c-8b0d-baa48a44e133" />

This is a global selection that allows two different color/shading options for use during daylight or nighttime station operation.


## Settings Page
<img width="224" height="48" alt="image" src="https://github.com/user-attachments/assets/e0ec7fdb-b0aa-4218-8acd-8b7daf12a637" />

This page allows the operator to manage various input files and the database needed for proper station operation. Event files are loaded and saved from the user's Documents directory (per operating system). File Load/Export dialogs will open here and this directory can be opened quickly via the button provided on the Export page.

  * Windows: `%userprofile%\Documents\ultra-tracker\`
  * Linux: `$HOME/Documents/ultra-tracker`
  * MacOS:  `/Users/username/Documents/ultra-tracker`

> [!CAUTION]
> The functions marked in RED on the Settings page are completely destructive to the local database and **MUST NOT be performed during normal operation!**  These are provided only for recovery of the database or data and should only be used at the direction of the software team.

> [!WARNING]
> The functions in ORANGE are provided as a means to completely recover after a major database error and other methods have not corrected the issue.

The following is a description of each button's function.  Each of these will open a file open dialog to the `\Documents\Ultra-Tracker\.event-config\` directory.

#### Station Setup
* **Load Stations File**
This loads a `JSON` file containing each of the stations and their detailed information to allow ease of selection while setting up this application. A typical filename will be `eventname-YYYY-stations.json`.
* **Load Athletes File**  
This function loads a `.csv` file, supplied by race organizers, containing all athletes registered or checked in for the event, whether they are known to have started _or not_.
* **Load DNS File**
This function loads a `.csv` file, supplied by race organizers, containing all of the athletes known to have **not started** the race.
* **Load DNF File**
This function loads a `.csv` file, supplied by race organizers, containing all of the athletes known to have **not finished** the race.

  As an event proceeds more DNF athletes will be recorded and new DNF files will be supplied to stations.

  Importing new DNF files will update all athletes recorded and DNF earlier in the race, DNFs past the current station are ignored.  This provides insight of which athletes are still expected into the current station.

#### RFID Configuration
* **Initialize RFID**
Starts and stops a RFID reader service for the Zebra FXR90 hardware.  These controls are enabled only for Start and Finish Line stations only.  Integrations with more RFID hardware will be possible in the future.

#### Application Settings
* **Reset App Settings** 
This function will reset the local application settings file to defaults.  This can be useful for recovering from an unexpected error.
The application settings file `config.json` is located at:
  * Windows: `%appdata%\ultra-tracker`
  * Linux: `~/.config/ultra-tracker`
  * MacOS:  `~/Library/Application Support/ultra-tracker`

#### Developer Tools
* **Recreate Database**
This function is the means where *ALL* **database entries and tables are removed** resulting in the loss of *ALL* setup data and entry history!  The intent is to allow recovery of a major database corruption event and the rapid rebuild and subsequent return to normal operation by the operator.
* **Recover Data From CSV File**
This function imports **ALL of the entries** that have previously been made by the operator since the start of this race event!  The Ultra-Tracker application has been automatically producing a file containing EVERY entry made by the operator continuously during normal operation! This function will restore all of this data to restore the program to the previous state automatically.

### Station Recovery Procedure
> [!WARNING]
> If instructed to do so, after the "Recreate Database" has been performed, perform the following steps:
>
> 1. Load the Stations file.
> 1. Load the Athletes file.
> 1. Load the DNS file.
> 1. Load the most recent DNF file.
> 1. Import a Full Export file using "Recover Data From CSV File".

### Local Database
Ultra-Tracker runs a modern database on the local machine.  All transactions are preserved immediately and the operator can close and re-open the app without loss of data.  A background task backs up the database to a secondary file, every 5 minutes.  This backup is used for emergency use only and may not restore all data in a data-loss event.  *Do not modify the local database files using external tools!*


## About Ultra-Tracker
A cross-platform desktop application for tracking athletes during ultra marathons.
This project is supported on Windows, Linux, and MacOS.

Built as an Electron application using TypeScript + React + Tailwind CSS.

**Project Page**: [https://github.com/barcradio/ultra-tracker](https://github.com/barcradio/ultra-tracker)

**Releases**: [https://github.com/barcradio/ultra-tracker/releases](https://github.com/barcradio/ultra-tracker/releases)

## Contributors
> | <div style="width:200px;fontSize:larger">**Name**</div> | <div style="width:100px;fontSize:larger">**Call Sign**</div> | <div style="width:200px;> fontSize:larger">**GitHub**</div> |
> | :------------------- | :----------- | :----------------------------------------------------- |
> | **Jaren Glenn**      | ---          | [**@derethil**](https://github.com/derethil)           |
> | **David Leikis**     | KG7EW        | [**@DLeikis**](https://github.com/DLeikis)             |
> | **Russ Leikis**      | KE7VFI       | [**@rleikis**](https://github.com/rleikis)             |
> | **Jorden Luke**      | KF7YEM       | [**@JordenLuke**](https://github.com/JordenLuke)       |
> | **Brian Marble**     | KG7AFQ       | [**@brianmarble**](https://github.com/brianmarble)     |
> | **Mitch Smith**      | N8MLS        | [**@pxls2prnt**](https://github.com/pxls2prnt)         |
> | **Brandon Tibbitts** | KD7IIW       | [**@Tibbs327**](https://github.com/Tibbs327)           |

## License
[MIT](https://opensource.org/license/mit) ©2024 [Bridgerland Amateur Radio Club](https://barconline.org/)
