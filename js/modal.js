class Modal {
  constructor(type, text, actionType = null) {
    this.type = type
    this.returnType = null

    this.successValue = null /* this is returned upon confirming the modal */
    this.failValue = null    /* this is returned upon cancelling the modal */
    
    let container =     El("div", "editor-modal")
    let body =          El("div", "modal-body")
    let message =       El("div", "modal-message", undefined, text)
    let confirmButton = El("div", "modal-button " + actionType ?? "", undefined, "Confirm [Enter]")
    let cancelButton =  El("div", "modal-button", undefined, "Cancel [Escape]")
    let buttons =       El("div", "modal-buttons")

    body.append(message)
    container.append(body, buttons)
    buttons.append(confirmButton, cancelButton)
    this.elements = { container, message, body, confirmButton, cancelButton }
    this["createType" + type.capitalize()]
    modal = this
  }
  open() {
    let 
    modalContainer = Q("#modal-container")
    modalContainer.classList.remove("hidden")
    modalContainer.append(this.elements.container)
    /* this opens the modal, and then returns a promise which is either fulfilled or rejected */
    return new Promise((resolve, reject) => {
      this.elements.confirmButton.onclick = () => {
        this.close()
        resolve(this.successValue)
      }
      this.elements.cancelButton.onclick = () => {
        this.close()
        reject(this.failValue)
      }
    })
  }
  close() {
    this.elements.container.remove()
    Q("#modal-container").classList.add("hidden")
    modal = null
  }
  createTypeConfirm() {
    this.returnType = "boolean"
  }
  createTypePrompt() {
    this.returnType = "string"
    let input = El("input", "modal-input", [["type", "text"]])
    this.elements.input = input
    this.elements.body.append(input)
  }
  createTypeAlert() {
    this.returnType = "null"

  }
  static types = [
    "confirm",
    "prompt",
    "alert",
  ]
}