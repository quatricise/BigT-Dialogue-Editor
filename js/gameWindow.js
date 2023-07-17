class GameWindow {
  constructor(element) {
    this.element = element
    this.windowType = "solid"
    this.uiComponents = []
    this.active = false
    this.visible = false
  }
  show() {
    this.visible = true
    this.element.classList.remove('hidden')
  }
  hide() {
    this.visible = false
    this.element.classList.add('hidden')
  }
  toggle() {
    this.element.classList.toggle('hidden')
  }
  handleInput(event) {
    this["handle" + event.type.capitalize()](event)
    this.handleSecondaryInput(event)
  }
  handleSecondaryInput(event) {

  }
  handleKeydown(event) {

  }
  handleKeyup(event) {

  }
  handleMousedown(event) {

  }
  handleMousemove(event) {

  }
  handleMouseup(event) {

  }
  handleClick(event) {

  }
  handleWheel(event) {

  }
  handlePointerdown(event) {

  }
  handlePointermove(event) {

  }
  handlePointerup(event) {

  }
  update() {

  }
}