![image](https://github.com/user-attachments/assets/f1d4e7a5-e90b-471c-9137-1f1022d9e1f9)

[![CI](https://github.com/barcradio/ultra-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/barcradio/ultra-tracker/actions/workflows/ci.yml)

An app for tracking athletes during ultra marathons.

An Electron application with React and TypeScript for Windows, Linux, and MacOS.

For a guide on how to set up an event using Ultra-Tracker, and advanced RFID configuration, visit the project [Wiki](https://github.com/barcradio/ultra-tracker/wiki).

---

<img width="1000" alt="image" src="https://github.com/user-attachments/assets/371cc7fe-8e23-4766-b332-2a79f4e30c70" />

---

## Getting Started

On first launch, Ultra-Tracker opens **Getting Started** to guide the user through starting an event for timing data collection.

1. Select **Load Event File** and choose the event file (`.zip`) supplied for the event.
2. Select the station identifier for this computer.
3. Select the operator callsign.
4. Select **Import Event**. When the import finishes, go to the Stats page to begin logging.

The event files can be selected from their existing location; they do not need to be copied into a
special folder first. The default event-config folder is `\Documents\Ultra-Tracker\.event-config\`.
Additional Drops files can be imported later from the Settings page.

The **Event Manager** can be launched in the sidebar to manage current and previous events.  Selecting **Create New Event** launches the **Getting Started** wizard.

## Navigation Sidebar

The left side bar is used to select different pages. Select from Stats, Roster, Logs, Export, Theme,
Event Manager, Database, Settings and Help. Hovering over the sidebar area will expand it to show
the names.

## Stats Page

<img alt="image" src="src/renderer/public/img/stats-page.png" />

<img alt="image" src="src/renderer/public/img/bib.png" />

The **BIB#** box is the main starting point for using this page. This input control will accept numerical input, either from the 10-key pad or top-row keys of all standard keyboards. See useful keyboard shortcuts below.

Clicking the In button and Out button will record the corresponding time entry.

When a station is configured for **Fast mode**, an optional **+/-** button can record both the In
and Out times together. This control is hidden by default and can be enabled in Settings under
**User Settings**. It is only available on Fast mode stations; the standard In and Out buttons and
keyboard shortcuts remain unchanged.

The datagrid columns can be Sorted by clicking on the column header. Click again to toggle Ascending or Descending Sort.

A Filter control for any column can be opened by clicking the Filter icon (three vertical dots).


### Editing a record

<img width="350" alt="image" src="src/renderer/public/img/athlete-edit.png" />

To edit a timing record, click on the icon at the far-right side of the record row.

The Edit pane allows modification or deletion of a timing record. The In and Out times, Drop Reason, and any notes that have been entered will be displayed. Changes to these fields must be applied to take effect, or cancelled to return to the Stats page.

If the Bib# can be matched with known athlete, the athlete's name will be displayed. The button above the name will jump to that athlete in the Roster page. A timing record for an unknown athlete is considered a warning condition, as all athletes should be known and checked in at the Start of the event, and included in the Athletes file. For a timing record not matched to athlete, limited changes can be performed, resolve the Bib# to a known athlete to modify all values.

> [!CAUTION]
> Deleting a time record is permanent. An entry to the Log page is recorded for reference.

Validation Rules:

- A record must have an In time.
- An In time must occur before the Out time.
- Commas are not allowed in the Note field, and will be replaced with semi-colons.

### Athlete and Station stats

<img width="300" alt="image" src="src/renderer/public/img/stats.png" />

Each of the different statistics available are updated in real-time.

The Watchlist count shows athletes marked for follow-up. Hover over the Watchlist row to view their bib numbers and names.

> [!WARNING]
> Warnings should be of interest to the station.

> [!CAUTION]
> Errors should be resolved before sending data to race organizers.

### Keyboard shortcuts

Entry of numbers and times is assisted by using some specific keys on both an 88 key (or more) keyboard or a 10-key Numpad. When the cursor is focused in the **Bib#** box, entering a bib number and pressing one of these keys will automatically enter the record and populate the corresponding time.

_10-key entry is recommended for all stations, for laptops without, use a USB 10-key peripheral._

> | <div style="width:150px;fontSize:larger">**In**</div> | <div style="width:150px;fontSize:larger">**Out**</div> | <div style="width:150px;fontSize:larger">**In and Out**</div> |
> | :------------- | :---------------- | :-------------- |
> | [Equal]        | [Minus]           | [Slash]         |
> | [Enter]        | [Numpad-Subtract] | [Backslash]     |
> | [Numpad-Add]   |                   | [Numpad-Divide] |
> | [Numpad-Enter] |                   |                 |

<img alt="image" src="src/renderer/public/img/keyboard-layout.png" />

## Roster Page

<img height="48" alt="image" src="src/renderer/public/img/roster-page.png" />

This page provides the list of all athletes and enable the operator to search for an athlete using different search keys, such as, name, bib number, city, start time, Station TimeIn, Station TimeOut and note entries.

The Status column helps station operators determine which athletes are pertinent to the station. Valid filter options for the Status column are: `Incoming, DNS, In, Out, Medical, Timeout, Withdrew`

<img alt="image" src="src/renderer/public/img/roster-watchlist.png" />     <img alt="image" src="src/renderer/public/img/stats-watchlist.png" />

Use the bookmark button at the left edge of an athlete row to add or remove that athlete from the **Watchlist**. The button appears when the row is hovered; an enabled watchlist button remains visible in red. When a watchlisted athlete arrives at the current station or is included in an imported Drops file, Ultra-Tracker displays an alert. Select **Remove from Watchlist** in the alert to remove the athlete from the Watchlist.

## Stations Page

<img height="48" alt="image" src="src/renderer/public/img/stations.png" />

This page is used to select the Station name and operator callsign. The callsign selection is currently superficial, and is populated by the metadata in the Stations file and cannot be modified during an event.

This page also shows the details about the aid stations throughout the race, location, mileage, cutoff times.

## Logs Page

<img height="48" alt="image" src="src/renderer/public/img/logs-page.png" />

This page displays the station log file that is auto-generated during station operation. There are two versions of the log that can be viewed and/or exported for the use of operators or developers to aid in fixing errors that may occur due to programming mistakes or unforeseen situations.

- The normal station log contains entries that occur during regular use and typical data gathering operations. This view may be used by operators to get a detailed understanding of where data errors may have been introduced, such as duplicate timing records.
- The verbose station log is a saved file that contains all events that occurred as well as debug messages designed to assist Ultra-Tracker developers to locate problems that occur during an event. This can be large and should be sent to the developers only upon request.

Watchlist additions, removals, and alerts are recorded in the normal station log with timestamps.

## Export Page

<img height="48" alt="image" src="src/renderer/public/img/export-page.png" />

This page provides Export utilities for sending station data to another station or race organizers. These file formats are optimized for human and machine readability.

Timing record indicators show the current delivery state:

| State         | Indicator                                                                                          | Meaning                                                 |
| :------------ | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| CSV export    | <img src="src/renderer/public/img/status/not-exported.svg" alt="Gray hollow circle" width="16">    | Not exported                                            |
| CSV export    | <img src="src/renderer/public/img/status/exported.svg" alt="Green hollow circle" width="16">       | Exported by a successful incremental or full CSV export |
| OpenSplitTime | <img src="src/renderer/public/img/status/upload-pending.svg" alt="Yellow solid circle" width="16"> | Pending upload                                          |
| OpenSplitTime | <img src="src/renderer/public/img/status/uploaded.svg" alt="Green solid circle" width="16">        | Uploaded                                                |
| OpenSplitTime | <img src="src/renderer/public/img/status/upload-failed.svg" alt="Red solid circle" width="16">     | Upload failed                                           |

- **Export Incremental CSV File**
  This function exports a `.csv` file of the station entries containing unsent or edited records, contains BibID, TimeIn, TimeOut, Drop Reason and any notes made by the operator. The exported file will be automatically named and incremented. e.g. `Aid05Times_04i.csv, Aid05Times_05i.csv, and Aid05Times_06i.csv`.

  Sending recent time records in smaller batches allows for much smaller files being routinely sent to race leadership to import to the race timing site, whether by packet radio or internet. This keeps timing data updated timely for athlete support crews and other situation in an event. Depending on the rate of athletes arriving and departing a station, sending an incremental file _every 30 minutes at a minimim_ is recommended, more often if possible.

  A station setup with a data entry PC networked to a data transmission PC is recommended so interruption of data entry is limited to a quick Incremental Export operation. This allows the data transmission operator to access the exported files independently.

  > [!CAUTION]
  > All Incremental files must be transmitted to the race leadership as each file only contains a portion of the overall station data.

- **Export Full CSV File**
  This function exports a full `.csv` file of **all time records** containing TimeIn, TimeOut, Drop Reason and any notes made by the station operators.

This file is useful as a final station report.

- **Export Drops File**
  This function exports a `.csv` file with all Drop entries (Not Started, Withdrew, Timeout, Medical, Unknown) that have occurred at or before the current station. This file is not normally needed to be sent to race organizers but can be an efficient way of sending the current station's Drops list to another station.

## Event Manager

<img height="48" alt="image" src="src/renderer/public/img/event-manager-page.png" />

The Event Manager is used to switch between events and recover from local event backups.

- **Events** tab lists saved event databases. Select an event and choose **Load Event** to make it the
  active event. The active event is marked with an **Active** tag and cannot be deleted while it is
  active.
- **Backups** tab lists automatic event database backups. Select a backup and choose **Restore Backup**
  to restore it. If an event with the same name already exists, confirm **Restore as New Event** to
  keep both Events.
- **Create New Event** opens the Getting Started workflow for new event.
- **Delete** an inactive event or backup with its delete button. Deleting an event is permanent.
- Enable **Open Event Manager on Startup** to choose an event whenever Ultra-Tracker starts. This
  is useful when the computer is used for more than one event.

## Theme

<img height="48" alt="image" src="src/renderer/public/img/theme-page.png" />

This is a global selection that allows two different color/shading options for use during daylight or nighttime station operation.

## Settings Page

<img height="48" alt="image" src="src/renderer/public/img/settings-page.png" />

<img width="800" alt="image" src="https://github.com/user-attachments/assets/538bcb74-5df4-416a-b458-43b9f04fdbf7" />


This page allows the operator to manage event input files and the database needed for proper station operation. Event files are loaded and saved from the user's Documents directory (per operating system). File Load/Export dialogs will open here and this directory can be opened quickly via the button provided on the Export page.

- Windows: `%userprofile%\Documents\ultra-tracker\`
- Linux: `$HOME/Documents/ultra-tracker`
- MacOS: `/Users/username/Documents/ultra-tracker`

### OpenSplitTime

OpenSplitTime is an optional integration for sending timing records directly to the configured event group. The configuration is done per event file, then sign in with an OpenSplitTime steward account that is a member of that event. Credentials can be saved between sessions. If both staging and production event groups are configured, select the environment before signing in. Production events send times to a live event and requires confirmation when switching from staging.

While signed in, OpenSplitTime status takes precedence over CSV export status in the timing-record indicator. Use **Pause Pushes** to temporarily stop automatic uploads without signing out; **Resume Pushes** restarts them. **Sign Out** returns the indicator to the CSV export state and does not change whether a record has been exported.

### User Settings

- **Grid Text Size**
  Use the A-/A+ controls to adjust the size of text in data grids, buttons, and text inputs. The
  setting is saved and restored when Ultra-Tracker is restarted. The keyboard shortcuts are
  Ctrl/Cmd + `=` to increase, Ctrl/Cmd + `-` to decrease, and Ctrl/Cmd + `0` to reset.
- **Show +/- Button**
  Enables the optional +/- action button on the Stats page. This button is useful for touchscreens and is off by default.

> [!CAUTION]
> The functions marked in RED on the Settings page are completely destructive to the local database and **MUST NOT be performed during normal operation!** These are provided only for recovery of the database or data and should only be used at the direction of the software team.

> [!WARNING]
> The functions in ORANGE are provided as a means to completely recover after a major database error and other methods have not corrected the issue.

The following is a description of each button's function. Each of these will open a file open dialog to the `\Documents\Ultra-Tracker\.event-config\` directory.

#### Drops File Import

- **Load Drops File**
  This function loads a `.csv` file, supplied by race organizers, containing all of the athletes known to have **not started** or **dropped from** the race (Withdrew, Timeout, Medical, Unknown).

  As an event proceeds more Drops will be recorded and new Drops files will be supplied to stations.

  Importing new Drops files will update all athletes recorded as dropped at or before the current station; drops past the current station are ignored. This provides insight of which athletes are still expected into the current station.

#### RFID Configuration

- **Initialize RFID**
  Starts and stops a RFID reader service for the Zebra FXR90 hardware. These controls are enabled only for Start and Finish Line stations only. Integrations with more RFID hardware will be possible in the future.

#### Application Settings

- **Reset App Settings**
  This will reset the local application settings file to defaults. This can be useful for recovering from an unexpected error.
  The application settings file `config.json` is located at:
  - Windows: `%appdata%\ultra-tracker`
  - Linux: `~/.config/ultra-tracker`
  - MacOS: `~/Library/Application Support/ultra-tracker`

#### Developer Tools

- **Reload Events File**
  This function reloads an event archive file (`.zip`), updating station data, athlete rosters, and initial drop records in the currently loaded event database.
- **Recreate Database**
  This function is the means where _ALL_ **database entries and tables are removed** resulting in the loss of _ALL_ setup data and entry history! The intent is to allow recovery of a major database corruption event and the rapid rebuild and subsequent return to normal operation by the operator.
- **Recover Data From CSV File**
  This function imports **ALL of the entries** that have previously been made by the operator since the start of this race event! The Ultra-Tracker application has been automatically producing a file containing EVERY entry made by the operator continuously during normal operation! This function will restore all of this data to restore the program to the previous state automatically.

### Station Recovery Procedure

> [!WARNING]
> If instructed to do so, after the "Recreate Database" has been performed, perform the following steps:
>
> 1. Create a new event using the Event Manager.
> 1. Reload the event database file.
> 1. Load the Drops file if applicable.
> 1. Import a Full Export file using "Recover Data From CSV File".

### Local Database

Ultra-Tracker runs a SQLite database on the local machine. All transactions are preserved immediately and the operator can close and re-open the app without loss of data. A background task backs up the database to a secondary file, every 5 minutes. This backup is used for emergency use only and may not restore all data in a data-loss event. _Do not modify the local database files using external tools!_

## About Ultra-Tracker

A cross-platform desktop application for tracking athletes during ultra marathons.
This project is supported on Windows and future support for Linux and MacOS.

Built as an Electron application using TypeScript + React + Tailwind CSS.

**Project Page**: [https://github.com/barcradio/ultra-tracker](https://github.com/barcradio/ultra-tracker)

**Releases**: [https://github.com/barcradio/ultra-tracker/releases](https://github.com/barcradio/ultra-tracker/releases)

## Contributors

> | <div style="width:200px;fontSize:larger">**Name**</div> | <div style="width:100px;fontSize:larger">**Call Sign**</div> | <div style="width:200px;> fontSize:larger">**GitHub**</div> |
> | :------------------- | :----------- | :----------------------------------------------------- |
> | **Paul Carter**      | KG7OKR       | [**cartpaul**](https://github.com/cartpauj)            |
> | **Jaren Glenn**      | ---          | [**@derethil**](https://github.com/derethil)           |
> | **David Leikis**     | KG7EW        | [**@DLeikis**](https://github.com/DLeikis)             |
> | **Russ Leikis**      | KE7VFI       | [**@rleikis**](https://github.com/rleikis)             |
> | **Jorden Luke**      | KF7YEM       | [**@JordenLuke**](https://github.com/JordenLuke)       |
> | **Brian Marble**     | KG7AFQ       | [**@brianmarble**](https://github.com/brianmarble)     |
> | **Mitch Smith**      | N8MLS        | [**@pxls2prnt**](https://github.com/pxls2prnt)         |
> | **Brandon Tibbitts** | KD7IIW       | [**@Tibbs327**](https://github.com/Tibbs327)           |

**Notice:** Starting in Aug 2026 our team is utilizing GitHub Copilot to augment development of UltraTracker. All generated code is human reviewed for function and project compliance.

## License

[MIT](https://opensource.org/license/mit) ©2024 [Bridgerland Amateur Radio Club](https://barconline.org/)
