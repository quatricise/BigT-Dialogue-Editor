class HistoryMachine {
  constructor() {
    this.states =       /** @type Array<HistoryState> */ []
    this.currentState = /** @type HistoryState */ null
  }
  goForwards() {
    this.currentState = this.states.after(this.currentState)
  }
  goBackwards() {
    this.currentState = this.states.before(this.currentState)
  }
}