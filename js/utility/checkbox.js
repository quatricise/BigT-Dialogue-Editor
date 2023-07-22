class Checkbox extends UIComponent {
  constructor(programWindow, parentElement, options = {size: null, useParentAsHitbox: false}) {
    super(programWindow)
    this.checked = false
    this.parentElement = parentElement
    /* set options */
    this.useParentAsHitbox =  options.useParentAsHitbox ?? false
    this.size =               options.size ?? 24

    //#region HTML
    let container = El("div", "checkbox")
    let checkmark = El("img", "checkbox-mark", [["src", "assets/icons/checkmark.png"]])

    container.style.width = this.size + "px"
    container.style.height = this.size + "px"
    this.elements = {container, checkmark}

    container.append(checkmark)
    parentElement.append(container)
    //#endregion HTML
  }
  handleMousedown(/** @type UIEvent */ e) {
    let targetChildren = Array.from(e.target.childNodes)
    if(
      (this.useParentAsHitbox && targetChildren.find(n => n === this.elements.container))
      || e.target === this.elements.container
    ) {
      this.toggle()
      console.log(this.checked)
    }
  }
  toggle() {
    this.checked ? this.uncheck() : this.check()
  }
  check() {
    this.checked = true
    this.updateHTML()
  }
  uncheck() {
    this.checked = false
    this.updateHTML()
  }
  updateHTML() {
    this.checked ? this.elements.container.classList.add("checked") : this.elements.container.classList.remove("checked")
  }
}