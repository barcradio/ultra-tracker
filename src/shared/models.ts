export type Runner = {
    index: number
    bib: number
    firstname: string
    lastname: string
    gender: string
    age: number
    city: string
    state: string
    emPhone: string
    emName: string
    dns: Boolean
    dnf: Boolean
    dnfStation: number
    // dnfDateTime: Date
}

export type TimingRecord = {
    bib: number
    datetime: Date
    in: Boolean
    out: Boolean
    note: string
}

export type Station = {
    name: string
    operators: Operator[]
}

export type Operator = {
    fullname: string
    callsign: string
    phone: number
}