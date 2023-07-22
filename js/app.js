let cw = window.innerWidth
let ch = window.innerHeight
let dt = 0 /* deltaTime */
let lastTime = 0

/* where the global modal window is stored in case it fires */
let modal = null

const mouse  = new Mouse()
const dialogueEditor = new DialogueEditor()

window.onresize = () => {
  cw = window.innerWidth
  ch = window.innerHeight
  dialogueEditor.canvas.width = cw
  dialogueEditor.canvas.height = ch
}

dialogueEditor.show()

/* input part */
function attachListeners() {
  document.addEventListener("contextmenu", function(e) {
    e.preventDefault()
  })
  document.addEventListener("keydown", function (e) {
    handleGlobalInput(e)
  })
  document.addEventListener("keyup", function (e) {
    handleGlobalInput(e)
  })
  document.addEventListener("mousemove", function (e) {
    handleGlobalInput(e)
  })
  document.addEventListener("pointermove", function(e) {
    handleGlobalInput(e)
  })
  document.addEventListener("mousedown", function (e) {
    if(e.button === 1) 
      e.preventDefault()
    handleGlobalInput(e)
  })
  document.addEventListener("mouseup", function (e) {
    handleGlobalInput(e)
  })
  document.addEventListener("click", function (e) {
    handleGlobalInput(e)
  })
  document.addEventListener("wheel", function (e) {
    handleGlobalInput(e)
  })
  document.addEventListener("pointerdown", function (e) {
    handleGlobalInput(e)
  })
}

function handleGlobalInput(e) {
  updateKeys(e)
  mouse.handleInput(e)
  dialogueEditor.handleInput(e)
  dialogueEditor.uiComponents.forEach(comp => comp.handleInput(e))
}

/* update the editor */
function tick() {
  /* set delta */
  let now = Date.now()
  dt = (now - lastTime) / 1000
  lastTime = now

  dialogueEditor.update()
  window.requestAnimationFrame(tick)
}

attachListeners()
tick()