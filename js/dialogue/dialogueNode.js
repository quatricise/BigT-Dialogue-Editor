class DialogueNode {
  constructor(
    type, 
    pos = new Vector(cw/2, ch/2), 
    options = {
      /** @type Number */ id: null, 
      /** @type String */ speaker: null, 
      /** @type String */ recipient: null, 
      /** @type String */ text: null,
      /** @type [] */     transfer: null,
      /** @type [] */     criteria: null, 
      /** @type Object */ labels: null, 
      /** @type [] */     factsToSet: null, 
      /** @type String */ tree: null, 
      /** @type [] */     preconditions: null, 
      /** @type String */ preconditionLogic: null, 
      /** @type String */ tone: null
    }
  ) {
    this.pos = pos.clone()
    this.type = type
    this.id = options.id || uniqueID(dialogueEditor.nodes)
    this.speaker = options.speaker || null
    this.recipient = options.recipient || null
    this.tree = options.tree ?? null
    this.text = options.text ?? ""
    this.criteria = options.criteria ?? []
    this.factsToSet = options.factsToSet ?? []
    this.labels = {
      lie:        options.labels?.lie         || false,
      exaggerate: options.labels?.exaggerate  || false,
    }
    this.in = []
    this.out = []

    /* optional parameter: it informs the game what the tone of the message is, so it can adjust character sprites or other things accordingly */
    this.tone = options.tone ?? "normal"

    /* set transfer only if it's a transfer node */
    if(this.type === "transfer")
      this.transfer = options.transfer ?? [{owner: "player", items: [""]}, {owner: "player", items: [""]}]
    else
      this.transfer = null

    /* this contains a set of node IDs that are required to run through before this node is accepted */
    this.preconditions = new Set()
    if(Array.isArray(options.preconditions)) {
      options.preconditions.forEach(value => this.preconditions.add(value))
    }
    
    /* the logical operation used, OR or AND are accepted */
    this.preconditionLogic =  options.preconditionLogic ?? "OR"

    /* editor-only features */
    this.stacks = new Set() 
    this.unfinished = false

    dialogueEditor.nodes.push(this)
    this.createHTML()
    this.update()
    this.reorderOutputs()
  }
  drag() {
    this.pos.add(mouse.clientMoved)
  }
  //#region create HTML
  createHTML() {
    /* header */
    let node =                    El('div', "dialogue-node")
    let header =                  El('div', "dialogue-node-header")
    let nodeTitle =               El('div', "dialogue-node-title", [["title", this.type.capitalize().splitCamelCase() + " Node"]])
    let nodeIcon =                new Image()
    let widgetRemove =            El("div", "dialogue-node-widget remove",                  [["title", "Delete node | SHIFT Click to delete and reroute inputs"]])
    let widgetProperties =        El("div", "dialogue-node-widget list",                    [["title", "Open node properties"]])
    let widgetPrecondition =      El("div", "dialogue-node-widget precondition",            [["title", "Set preconditions"]])
    let widgetPreconditionLogic = El("div", "dialogue-node-widget precondition-logic or",   [["title", "Set logical operation for preconditions"]])
    let widgetUnfinished =        El("div", "dialogue-node-widget unfinished",              [["title", "Mark as unfinished"]])
    let factCount =               El("div", "condition-count active")
    let filler =                  El("div", "filler")
    let content =                 El("div", "dialogue-node-content")
    let toneIndicator =           El("div", "dialogue-node-tone-indicator")
    
    /* sockets */
    let wrapperOut =  El('div', "dialogue-node-socket-wrapper out")
    let wrapperIn  =  El('div', "dialogue-node-socket-wrapper in")
    let socketOut =   El.special('node-socket-out')
    let socketIn =    El.special('node-socket-in')
    socketOut.dataset.index = this.out.length

    nodeIcon.classList.add("dialogue-node-icon")
    nodeIcon.src = `assets/icons/iconNodeType${this.type.capitalize()}.png`
    nodeIcon.style.filter = "opacity(0.5)"

    /* append stuff */
    nodeTitle.append(nodeIcon)
    header.append(widgetRemove, widgetProperties, widgetPrecondition, widgetPreconditionLogic, widgetUnfinished, filler, nodeTitle)
    node.append(header, content, factCount, wrapperOut, wrapperIn)
    wrapperOut.append(socketOut)
    wrapperIn.append(socketIn)

    /* this is used for attaching the variable features of each specific node */
    this.nodeHTMLContent = content

    dialogueEditor.element.append(node)
    this.element = node
    node.dataset.id = this.id
    node.onmouseover = () => node.style.zIndex = 3
    node.onmouseout = () => node.style.zIndex = ""

    /* specific features per node type */
    this["createHTML" + this.type.capitalize()]()

    /* attach thumbnails to person fields */
    if(dialogueEditor.options.useThumbnails) {
      Array.from(this.element.querySelectorAll(".dialogue-node-speaker"))
      .forEach(element => {
        this.setPersonThumbnail(element, element.innerText)
      })  
    }
  }
  setPersonThumbnail(element, person, isVariable) {
    let 
    thumbnail = new Image()
    thumbnail.style.height = "32px"
    thumbnail.style.marginRight = "5px"

    isVariable ? thumbnail.src = "assets/icons/iconEmptyCharacter.png" : thumbnail.src = `assets/portraits/${person}.png`
    element.prepend(thumbnail)

    /* dim if the field is assigned to empty character */
    person === "empty" || person === "dummyCaptain" ? thumbnail.style.filter = "opacity(0.33)" : thumbnail.style.filter = ""
  }
  createHTMLText() {
    let labels =                El("div", "dialogue-node-label-container")
    let lieLabel =              El("div", "dialogue-node-label", [["title", "The player is lying"]], "Lie")
    let exaggerateLabel =       El("div", "dialogue-node-label", [["title", "The player is exaggerating"]], "Exaggerate")
    let speaker =               El('div', "dialogue-node-row dialogue-node-speaker", [["title", "Speaker"]], this.speaker)
    let text =                  El('div', "dialogue-node-row dialogue-node-text-field", [["title", "Text"]], this.text)

    if(this.labels.lie)         lieLabel.classList.add("active")
    if(this.labels.exaggerate)  exaggerateLabel.classList.add("active")

    speaker.dataset.datatype = "speaker"
    speaker.dataset.id = this.id
    text.dataset.editable = "true"
    text.dataset.datatype = "text"
    lieLabel.dataset.nodelabel = "lie"
    exaggerateLabel.dataset.nodelabel = "exaggerate"

    labels.append(lieLabel, exaggerateLabel)
    this.nodeHTMLContent.append(speaker, text, labels)
  }
  createHTMLPass() {
    let speaker = El('div', "dialogue-node-row dialogue-node-speaker", [["title", "Speaker"]], this.speaker)
    let text =    El('div', "dialogue-node-row dialogue-node-row-informational", [["title", "Text"]], "Speaker says nothing.")

    speaker.dataset.datatype = "speaker"
    speaker.dataset.id = this.id
    this.nodeHTMLContent.append(speaker, text)
  }
  createHTMLWhisper() {
    let speaker =   El('div', "dialogue-node-row dialogue-node-speaker", [["title", "Speaker"]], this.speaker)
    let recipient = El('div', "dialogue-node-row dialogue-node-speaker", [["title", "Speaker"]], this.recipient)
    let text =      El('div', "dialogue-node-row dialogue-node-text-field", [["title", "Text"]], this.text)

    speaker.dataset.datatype = "speaker"
    speaker.dataset.id = this.id
    recipient.dataset.datatype = "recipient"
    recipient.dataset.id = this.id
    text.dataset.editable = "true"
    text.dataset.datatype = "text"
    this.nodeHTMLContent.append(speaker, recipient, text)
  }
  createHTMLResponsePicker() {

  }
  createHTMLTransfer() {
    let cont = El('div', "dialogue-node-transfer-container")
    /* create the person rows */
    for(let i = 0; i < 2; i++) {
      let row =       El("div", "dialogue-node-transfer")
      let speaker =   El('div', "dialogue-node-row dialogue-node-speaker", [["title", "Owner of these items"]])
      let itemCont =  El("div", "dialogue-node-item-container")
      let icon =      El("div", "dialogue-node-icon plus hover-dark-02")
      let addButton = El("div", "dialogue-node-add-item",  [["title", "Add new item slot"]])

      /* for each item in both rows of transfer, add an item element into this array */
      let items = this.transfer[i].items.map(() => {
        return El("div", "dialogue-node-item empty", [["title", "Click to select an item"]])
      })

      row.dataset.personindex = i

      speaker.innerText = this.transfer[i].owner
      speaker.dataset.datatype = "speaker"
      speaker.dataset.speaker = this.transfer[i].owner
      speaker.dataset.id = this.id

      icon.dataset.personindex = i
      itemCont.dataset.personindex = i

      items.forEach((item, index) => {
        item.dataset.itemindex = index
        item.dataset.datatype = "item"
        item.dataset.item = this.transfer[i].items[index]
      })

      this.transfer[i].items.forEach((item, index) => {
        if(item == "") return
        let thumbnail = new Image()
            thumbnail.src = `assets/${data.item[item].folder ?? "item"}/${item}.png`
        items[index].append(thumbnail)
      })

      addButton.append(icon)
      itemCont.append(...items, addButton)
      row.append(speaker, itemCont)
      cont.append(row)
    }
    this.nodeHTMLContent.append(cont)
  }
  createHTMLAggression() {
    let speaker = El('div', "dialogue-node-row dialogue-node-speaker", [["title", "Speaker"]], this.speaker)
    let text =    El('div', "dialogue-node-row dialogue-node-row-informational", [["title", "Text"]], "Speaker turns aggressive.")
    speaker.dataset.datatype = "speaker"
    speaker.dataset.id = this.id
    this.nodeHTMLContent.append(speaker, text)
  }
  createHTMLFactSetter() {
    let factContainer = El("div", "dialogue-node-fact-container")
    let addFactButton = El("div", "dialogue-node-add-fact-button ui-graphic")
    this.nodeHTMLContent.append(factContainer, addFactButton)
    this.refreshHTML()
  }
  createHTMLTree() {
    let text = El('div', "dialogue-node-row dialogue-node-tree-row", [["title", "Text"]], "Select node tree.")
    text.dataset.datatype = "nodeTree"
    this.nodeHTMLContent.append(text)

    if(this.tree)
      this.setNodeTree(text, this.tree)
  }
  createHTMLWait() {
    let text = El('div', "dialogue-node-row dialogue-node-row", [["title", "How long to wait before processing the next node"]], "Wait for: 0")
    text.dataset.datatype = "number"
    this.nodeHTMLContent.append(text)
  }
  //#endregion create HTML
  addSetterFact(id, identifier = "fact_identifier", value = true) {
    this.factsToSet.push(Fact.createSetterFact(id, identifier, value))
    this.refreshHTML()
  }
  createSetterFactHTML(index, identifier, value) {
    let container = this.element.querySelector(".dialogue-node-fact-container")
    let row =               El("div", "dialogue-node-fact-row", [["data-factindex", index]])
    let identifierElement = El("div", "dialogue-node-fact-identifier", [["data-editable", "true"], ["data-datatype", "nodeFactIdentifier"]], identifier)
    let valueElement =      El("div", `dialogue-node-fact-value ${value}`,    [["data-editable", "true"], ["data-datatype", "factValue"], ["data-isboolean", "true"]], value)
    let deleteButton =      El("div", "dialogue-node-fact-delete-button ui-graphic")

    row.append(identifierElement, valueElement, deleteButton)
    container.append(row)
  }
  flipSetterFact(index) {
    this.factsToSet[index].value = !this.factsToSet[index].value
    this.refreshHTML()
  }
  setFactIdentifier(index, identifier) {
    this.factsToSet[index].identifier = identifier
  }
  removeSetterFact(index) {
    console.log("remove setter fact")
    this.factsToSet.splice(index, 1)
    this.refreshHTML()
  }
  setNodeTree(textField, filename) {
    if(dialogueEditor.files.has(filename)) {
      let nodes = dialogueEditor.files.get(filename).nodes

      /* find exit nodes */
      let exitNodes = nodes.filter(n => n.out.length === 0)
      
      /* delete sockets */
      let sockets = Array.from(this.element.querySelectorAll(".dialogue-node-socket.out"))
      sockets.forEach(s => s.remove())

      /* create new sockets */
      for (let i = 0; i < exitNodes.length; i++) {
        let socketOut = El.special('node-socket-out')
        socketOut.dataset.index = i
        socketOut.title = exitNodes[i].type.capitalize().splitCamelCase() + " - " + exitNodes[i].text
        this.element.querySelector(".dialogue-node-socket-wrapper.out").append(socketOut)
      }
      let rect = this.element.querySelector(".dialogue-node-socket-wrapper.out").getBoundingClientRect()
      this.element.style.minWidth = rect.width + 25 + "px"
      
      this.tree = filename
      textField.innerText = filename
    }
    else {
      textField.innerText = this.tree ?? "Select node tree."
        alert("Dialogue tree not found.")
    }

    /* old method */
    // fetch(`data/dialogue/${treeName}.json`)
    // .then((response) => {
    //   if(response.ok) {
    //     response.json().then(nodes => {
    //       /* find exit nodes */
    //       let exitNodes = nodes.filter(n => n.out.length === 0)
          
    //       /* delete sockets */
    //       let sockets = Array.from(this.element.querySelectorAll(".dialogue-node-socket.out"))
    //       sockets.forEach(s => s.remove())

    //       /* create new sockets */
    //       for (let i = 0; i < exitNodes.length; i++) {
    //         let socketOut = El.special('node-socket-out')
    //         socketOut.dataset.index = i
    //         socketOut.title = exitNodes[i].type.capitalize().splitCamelCase() + " - " + exitNodes[i].text
    //         this.element.querySelector(".dialogue-node-socket-wrapper.out").append(socketOut)
    //       }
    //       let rect = this.element.querySelector(".dialogue-node-socket-wrapper.out").getBoundingClientRect()
    //       this.element.style.minWidth = rect.width + 25 + "px"
    //     })
    //     this.tree = treeName
    //     textField.innerText = treeName
    //   }
    //   else {
    //     textField.innerText = this.tree ?? "Select node tree."
    //     alert("Dialogue tree not found.")
    //   }
    // })
  }
  refreshHTML() {
    this[`refresh${this.type.capitalize()}HTML`]()
  }
  refreshFactSetterHTML() {
    this.element.querySelector(".dialogue-node-fact-container").innerHTML = ""
    this.factsToSet.forEach((fact, index) => this.createSetterFactHTML(index, fact.identifier, fact.value))
  }
  reorderOutputs() {
    /* trees have a fixed number of outputs based on the exit node count inside*/
    if(this.type === "tree") return

    let sockets = Array.from(this.element.querySelectorAll(".dialogue-node-socket.out"))
    sockets.forEach(s => s.remove())

    let i = 0
    do {
      let socketOut = El.special('node-socket-out')
      socketOut.dataset.index = i
      this.element.querySelector(".dialogue-node-socket-wrapper.out").append(socketOut)
      i++
    } while (i < this.out.length + 1*(this.type === "responsePicker"))

    this.out.forEach((node, index) => {
      node.index = index
    })
  }
  createConnection(to, treeOutputIndex) {
    /* delete other outputs unless it's a special type of node */
    if(this.type !== "responsePicker" && this.type !== "tree")
      this.deleteOut()

    if(to.id === this.id) return
    
    /* return if the connection already exists */
    if(to.in.find(connection => connection.from.id === this.id)) return
    if(to.out.find(connection => connection.to.id === this.id)) return

    let index
    if(this.type === "tree") {
      index = treeOutputIndex
      /* delete connection from this socket if it exists */
      let conn = this.out.find(conn => conn.index === treeOutputIndex)
      if(conn) {
        let to = dialogueEditor.nodes.find(node => node.id === conn.to.id)
        let destinationRef = to.in.find(conn => conn.from.id === this.id)
        to.in.remove(destinationRef)
        this.out.remove(conn)
      }
    }
    else {
      index = this.out.length
    }
    let conn = {to, index}
    this.out.push(conn)

    to.in.push({from: this})

    if(this.type === "responsePicker")
      this.reorderOutputs()
  }
  deleteConnection(index) {
    let conn = this.out[index]
    let to = dialogueEditor.nodes.find(node => node.id === conn.to.id)
    let destinationRef = to.in.find(conn => conn.from.id === this.id)
    to.in.splice(to.in.indexOf(destinationRef), 1)
    this.out.splice(index, 1)
    this.reorderOutputs()
  }
  deleteIn() {
    this.in.forEach(conn => {
      let from = dialogueEditor.nodes.find(node => node.id === conn.from.id)
      let originRef = from.out.find(conn => conn.to.id === this.id)
      from.reorderOutputs()
      from.out.splice(from.out.indexOf(originRef), 1)
    })
    this.in = []
  }
  deleteOut() {
    this.out.forEach(conn => {
      let to = dialogueEditor.nodes.find(node => node.id === conn.to.id)
      let destinationRef = to.in.find(conn => conn.from.id === this.id)
      to.in.remove(destinationRef)
    })
    this.out = []
  }
  update() {
    this.element.style.left = this.pos.x + "px"
    this.element.style.top = this.pos.y + "px"

    if(this.criteria.length || this.preconditions.size) {
      let conditionCount = this.element.querySelector(".condition-count")
      conditionCount.innerText = ""
      if(this.criteria.length) 
        conditionCount.innerText += this.criteria.length + `${this.criteria.length === 1 ? " criterion" : " criteria"}`
      if(this.preconditions.size)
        conditionCount.innerText += (this.criteria.length ? `, ` : "") + this.preconditions.size + `${this.preconditions.size === 1 ? " precondition" : " preconditions"}`
      this.element.querySelector(".condition-count").classList.remove("hidden")
    }
    else this.element.querySelector(".condition-count").classList.add("hidden")
  }
  destroy() {
    this.deleteIn()
    this.deleteOut()
    this.element.remove()
    dialogueEditor.unsetActiveNode()
    dialogueEditor.nodes.remove(this)
    dialogueEditor.deselectNode(this)
    dialogueEditor.reconstructHTML()

    /* clear preconditions if this node was mentioned anywhere */
    dialogueEditor.nodes.forEach(node => node.preconditions.delete(this.id))

    /* remove this node from sections if they contain it */
    dialogueEditor.sections.forEach(section => section.nodes.delete(this))

    /* remove this node from stacks if they contain it */
    this.stacks.forEach(s => s.deleteNodes(this))

    dialogueEditor.markFileAsUnsaved()
  }
  static types = [
    "text",
    "responsePicker",
    "transfer",
    "whisper",
    "pass",
    "aggression",
    "factSetter",
    "tree",
    "wait"
  ]
  static tones = [
    "normal",
    "sarcastic",
    "scared",
    "aggressive",
    "mocking",
    "angry",
    "upset",
    "sad",
    "happy",
    "intrigued",
    "suspicious",
  ]
}