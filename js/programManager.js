class ProgramManager {
  static windows =      /** @type Array<ProgramWindow> */ []
  static activeWindow = /** @type ProgramWindow */ null
  static addWindows(...wins) {
    this.windows.push(...wins)
  }
  static setWindow(win) {
    this.activeWindow = win

    if(win.windowType === "solid") {
      this.windows.forEach(w => w.hide())
    }
    this.activeWindow.show()
  }
  static handleInput(e) {
    this.activeWindow.handleInput(e)
    this.activeWindow.uiComponents.forEach(comp => comp.handleInput(e))
  }
}