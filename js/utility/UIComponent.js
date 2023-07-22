class UIComponent {
  constructor(programWindow) {
    programWindow.uiComponents.push(this)
    this.programWindow = programWindow
    UIComponent.list.push(this)
  }
  handleInput(event) {
    this["handle" + event.type.capitalize()](event)
  }
  handleKeydown() {

  }
  handleKeyup() {

  }
  handleMousedown() {

  }
  handleMousemove() {

  }
  handleMouseup() {

  }
  handleClick() {

  }
  handleWheel() {

  }
  handlePointerdown() {

  }
  handlePointerup() {

  }
  handlePointermove() {

  }
  update() {
    
  }
  destroy() {

  }
  static list = []
  static destroy(component) {
    component.programWindow.uiComponents.remove(component)
    this.list.remove(this)
    component.destroy()
  }
}