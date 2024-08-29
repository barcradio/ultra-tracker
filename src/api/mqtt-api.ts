//import * as mqtt from 'mqtt'

export class mqttAPI {
  num: number = 1;

  constructor() {
    this.num = 4;
  }

  getConnection() {
    return this.num;
  }
  //getConnection(type, name, options) { }
}
