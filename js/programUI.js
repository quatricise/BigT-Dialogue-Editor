class ProgramUI {
  constructor() {
    this.state = new State(
      "default",
      "resizing",
    )
  }
  handleInput(event) {

  }
  handleMousedown(event) {
    let target = event.target
    /* panel resizing */
    if(target.closest(".element-resizer")) {
      let resizeable = target.closest("[data-resizeable=true]")
      let resizeFrom = resizeable.dataset.resizefrom
      this.resizeData.resizeFrom = resizeFrom
      this.resizeData.element = resizeable
      this.state.set("resizing")
    }
  }
}