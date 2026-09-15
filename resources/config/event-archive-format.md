# Event archive file format

The Get Started wizard creates a new event database from a single `.zip` archive instead of
picking Stations, Athletes, and Drops files separately.

## Assembling the archive

Zip the following files directly at the root of the archive (do not put them inside a
subfolder, or the entry names will have a path prefix and won't be recognized):

| Entry name       | Required | Contents                                              |
| ----------------- | -------- | ------------------------------------------------------ |
| `stations.json`   | Yes      | Event + stations definition                            |
| `athletes.csv`    | Yes      | Athlete roster                                          |
| `drops.csv`       | No       | Initial known drops/DNS records                         |

Entry names are case-sensitive and must match exactly. If `stations.json` or `athletes.csv`
is missing, the import fails with a clear error and no event database is created.

## `stations.json`

See the [Stations File Setup wiki](https://github.com/barcradio/ultra-tracker/wiki/Stations-File-Setup)
for the complete `stations.json` schema. The event database slug is derived from `event.name`,
so it must be present.

## `athletes.csv`

Same schema accepted by athlete roster imports — header row:

```
Bib,First Name,Last Name,gender,age,city,state,emergency_name,emergency_phone
```

See [mock-athletes.csv](mock-athletes.csv) for an example. This is **not** the same as an
OpenSplitTime entrants export (`event_group_entrants_*.csv`, which uses a `Bib Number` column
and different fields) — that format is not accepted here.

## `drops.csv`

Same schema accepted by the Settings page "Load Drops File" import — a preamble line followed
by the header row:

```
<event>,<station>,drops-export
stationId,bibId,dropReason,dropDateTime,note
```

See [bear100-2026-station-6-mock-drops.csv](bear100-2026-station-6-mock-drops.csv) for an
example.
