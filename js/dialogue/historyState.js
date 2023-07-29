class HistoryState {
  constructor(type, data = {}) {
    if(!HistoryState.types.has(type)) throw "Invalid state: " + type
    this.type = type

    for(let key in data)
      this[key] = data[key]
  }
  static types = [
    "deleteNode",
    "deleteConnection",
    "createNode",
    "setNodeData",
    "createSection",
    "deleteSection",
  ]
}