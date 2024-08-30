# Ultra-tracker Help

## Operating Instructions

The left side bar of the Ultra-tracker is used to select different panels or to provide selection of different options affecting the entire application. **The viewing grids showing the log entries allow sorting of each column by mouse clicking on the column header. It will display an ascending order or a descending order for each column (except for the notes column).**

### Athlete Entry panel
The **BIB#** box should be the main starting point for using this panel. This application will accept numerical input, either from the 10-key pad or top-row keys of all standard keyboards.

The app performs a search of the bib number input by the operator to verify whether that person is listed as an athlete that did or did not start the race. If they did not start, an error is displayed allowing the operator to correct the bib number before proceeding.

Entry of numbers and times is assisted by using some specific keys on both an 88 key (or more) keyboard or a 10-key Numpad. Those special keys use the following rules from within the **BIB#** box:

#### **These will populate the In and Out Time and enter the record**
+ <kbd>Slash</kbd>
+ <kbd>Backslash</kbd>
+ <kbd>NumpadDivide</kbd>

#### **These will populate the In Time and enter the record**
+ <kbd>In</kbd> button (Mouse Click)
+ <kbd>Equal</kbd>
+ <kbd>Enter</kbd>
+ <kbd>NumpadAdd</kbd>
+ <kbd>NumpadEnter</kbd>
 
#### **These will populate the Out Time and enter the record**
+ <kbd>Out</kbd> button (Mouse Click)
+ <kbd>Minus</kbd>
+ <kbd>NumpadSubtract</kbd> 

### Search panel
The purpose of this panel is to function as an full list of all athletes and enable the operator to search for an athlete using different search keys, such as, name, bib number, city, start time, Station TimeIn, Station TimeOut and notes entries.

## Logs panel
The purpose of this panel is to display and export the station log file that is auto-generated during operation. There are two versions of the log that can be viewed and/or exported for the use of operators or developers to aid in fixing errors that may occur due to programming mistakes or unforeseen situations.
- The normal station log will contain entrees that happened during regular operation that indicates typical data gathering operations. This view may be used by all operators to allow a detailed look at the order and purpose of all standard events that have occurred during operation.
- The verbose station log contains all events that occurred as well as debug messages designed to assist the developers to locate problems that might occur. This file can be large and should be sent to the developers only upon request.

## Database panel
The database panel allows the operator to initialize the database and to load data for various input files needed for proper program operation. By default, system initialization files will be located in user documents directory and file reading/writing selection dialogs will open to this directory.
* Windows: `%userprofile%\Documents\ultra-tracker\`
* Linux `$HOME/Documents/ultra-tracker` 

<span style="color:red">**Warning: Some of these functions (marked in RED) are completely destructive to the local database and MUST NOT be performed during normal operation.**</span>

<span style="color:orange">These are provided as a means to completely recover after a major database error and other methods have not corrected these serious errors.</span>

The following is a description of each button and its' function.

- **Load Stations File**
This loads a json file containing each of the stations and their detailed information to allow ease of selection while setting up this application. As stated above, a file dialog will allow selection of this file that is placed, by default, in the folder `%userprofile%\Documents\ultra-tracker\`. Any other location can be selected. A typical filename will be bear100-YYYY-stations.json.

- **Load Athletes File**  
This function loads a .csv file, supplied by race organizers, containing all of the athletes registered for the event whether they are known to have started or not.

- **Load DNS File**
This function loads a .csv file, supplied by race organizers, containing all of the athletes known to have **not started** the race.

- **Load DNF File**
This function loads a .csv file, supplied by race organizers, containing all of the athletes known to have **not finished** the race.

- **Export Recent Events File**  
This function exports a .csv file of the station entries containing each athlete and their TimeIn, TimeOut, DNF/DNS status and any notes made by the operator of those events that have **Not already been sent**.
(Sending only the recent results allows for much shorter files being routinely sent to the network database via radio.)


- **Export All Events File**
This function exports a .csv file of the station entries containing each athlete and their TimeIn, TimeOut, DNF/DNS status and any notes made by the operator of **all events** that have **been entered**.  

  -  > Sending all results since the start of the race >results in **longer files** being sent to the network database via radio.


- **Destroy and Init Database**
This function is the means where *ALL* **database entries and tables are removed** resulting in the loss of *ALL* setup data and entry history!  The intent is to allow recovery of a major database corruption event and the rapid rebuild and subsequent return to normal operation by the operator.
   While the previous button of "Destroy and Init Database" is drastic, this allows us to now rebuild the database and application back to the previous state!

**Import History File to DB**
This function imports **ALL of the entries** that have previously been made by the operator since the start of this race event!  The Ultra-tracker application has been automatically producing a file containing EVERY entry made by the operator continuously during normal operation! This function will restore all of this data to restore the program to the previous state automatically.

### Procedure for recovery of Ultra-Tracker application
<span style="color:orange">After the "Destroy and Init Database" has been performed, perform the following steps:</span>

1. Load the Stations File.
1. Load the Athletes File.
1. Load the DNS File.
1. Load the DNF File.
1. Import History File to DB.

### Theme panel
This is a global selection that allows two different color/shading options for use during daylight or nighttime operation.

### Settings panel
This panel has selections for entering the Station name, number, location in lat/long coordinates and operators names and callsigns.