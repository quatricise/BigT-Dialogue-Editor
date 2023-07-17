class DialogueEditor extends GameWindow {
  constructor() {
    super(Q('#dialogue-editor'))
    this.dialogueName = null
    this.description = "Dialogue description"
    this.sections = new Set()
    this.nodes = []
    this.folder = null
    this.activeNode = null
    this.editedData = {}
    this.history = new HistoryMachine()
    this.style = {connectionWidth: 12}
    this.scale = 1
    this.uiVisible = true

    /* this maps filenames to corresponding DialogueData */
    this.files = new Map()

    /* this is only filled upon opening a folder */
    this.characters = []
    
    /* an element that's visually highlighted using a blue outline */
    this.highlighted = null

    /* name of the last npc set inside a text node */
    this.lastNpc = Object.keys(data.person)[0]

    this.state = new State(
      "default",
      "connecting",
      "creating",
      "creatingContextMenu",
      "settingPreconditions",
      "deleting",
      "panning",
      "dragging",
      "editing",
      "loading",
      "selectingSpeaker",
      "selectingItem",
      "boxSelection",
    )
    this.selected = {
      connections: [],
      nodes: [],
    }
    this.options = {
      compactView: false,
      safeMode: false,
    }
    this.connectionData = {
      outputSocketIndex: null,
      /**
      * @type HTMLDivElement
      */
      placeholderSocket: null,
    }
    this.autoPan = {
      active: false,
      maxSpeed: 1,
    }
    this.boxSelection = {
      active: false,
      startPoint: new Vector(),
      endPoint: new Vector(),
      box: new BoundingBox(0, 0, 0, 0),
      visual: Q("#dialogue-editor-box-selection"),
      begin: () => {
        if(!keys.shift) {
          this.deselectAll()
          this.unsetActiveNode()
        }
        this.boxSelection.reset()
        this.boxSelection.active = true
        this.boxSelection.startPoint.setFrom(mouse.clientPosition)
        this.boxSelection.endPoint.setFrom(mouse.clientPosition)
        this.boxSelection.visual.classList.remove("hidden")
      },
      update(offset = mouse.clientMoved) {
        this.endPoint.add(offset)

        let topLeftPoint = new Vector()
        topLeftPoint.x = Math.min(this.startPoint.x, this.endPoint.x)
        topLeftPoint.y = Math.min(this.startPoint.y, this.endPoint.y)

        let bottomRightPoint = new Vector()
        bottomRightPoint.x = Math.max(this.startPoint.x, this.endPoint.x)
        bottomRightPoint.y = Math.max(this.startPoint.y, this.endPoint.y)

        let width =  bottomRightPoint.x - topLeftPoint.x
        let height = bottomRightPoint.y - topLeftPoint.y

        this.box = new BoundingBox(
          topLeftPoint.x,
          topLeftPoint.y,
          width,
          height,
        )
        
        this.updateVisual()
      },
      updateVisual() {
        this.visual.style.width   = this.box.w + "px"
        this.visual.style.height  = this.box.h + "px"
        this.visual.style.left    = this.box.x + "px"
        this.visual.style.top     = this.box.y + "px"
      },
      end() {
        this.active = false
        this.endPoint.setFrom(mouse.clientPosition)
        this.selectObjects()
        this.visual.classList.add("hidden")
      },
      selectObjects: () => {
        let nodeRects = this.nodes.map(node => node.element.getBoundingClientRect())
        this.nodes.forEach((node, index) => {
          let nodeBox = new BoundingBox(
            nodeRects[index].x,
            nodeRects[index].y,
            nodeRects[index].width,
            nodeRects[index].height
          )
          if(Collision.auto(this.boxSelection.box, nodeBox)) {
            this.toggleSelectNode(node)
          }
        })
      },
      reset() {
        this.startPoint.set(0)
        this.endPoint.set(0)
      },
    }
    this.preconditionSetting = {
      active: false,
      toggle: () => {
        this.preconditionSetting.active ? this.preconditionSetting.deactivate() : this.preconditionSetting.activate()
      },
      activate: () => {
        if(this.preconditionSetting.active) return
        this.preconditionSetting.active = true
      },
      deactivate: () => {
        if(!this.preconditionSetting.active) return
        Qa(".dialogue-node-widget.precondition").forEach(widget => widget.classList.remove("active"))
        this.preconditionSetting.active = false
      },
    }
    this.createHtml()
    this.createPropertiesPanel()
  }
  createPropertiesPanel() {
    this.propertiesPanel = new PropertiesPanel(this, "view-bottom")
    this.propertiesPanel.hide()
  }
  createHtml() {
    /* svg container */
    this.svgCont = El("div", "svg-container")
    this.element.append(this.svgCont)

    this.textarea =   El("textarea", "dialogue-editor-textarea", [["type", "text"],["size", "300"],["width", ""]])

    /* canvas for drawing node connections */
    this.canvas = El("canvas", undefined, [["id", "dialogue-editor-canvas"]])
    this.canvas.width = cw
    this.canvas.height = ch
    this.element.append(this.canvas)

    /* create a placeholder socket that's shown when creating connections */
    let 
    socket = El.special("node-socket-out")
    socket.style.pointerEvents = "none"
    socket.style.position = "absolute"
    socket.classList.add("hidden")
    this.connectionData.placeholderSocket = socket
    this.element.append(socket)
  }
  openFolder() {
    let folder = window.prompt("Enter folder name", "saladin")
    if(!folder) return

    Server.getDialogueData(folder)
    .then(data => {
      this.folder = folder
      Q("#sidebar-left-files").innerHTML = ""
      Q("#sidebar-left-folder-heading").innerText = folder
      Q("#sidebar-left-folder-heading").classList.remove("faded-text")
      data.files.forEach(file => {
        let filename = file.replace(".json", "")
        this.createSidebarFileRow(filename)
      })
      this.characters = data.characters
    })
    .catch(e => console.log(e))
  }
  createSidebarFileRow(filename) {
    let container =     El("div", "sidebar-file-row", [["title", "Open file"]])
    let name =          El("div", "sidebar-file-row-name", undefined, filename)
    let icon =          El("img", "dialogue-icon-file"); icon.src = "assets/icons/iconDialogueFile.png"
    let filler =        El("div", "filler")
    let deleteButton =  El("div", "dialogue-node-file-close-button", [["title", "Delete file"]])

    container.dataset.filename = filename
    container.append(icon, name, filler, deleteButton)
    Q("#sidebar-left-files").append(container)
  }
  createCharacterList() {
    /* clear the list first */
    Qa(".sidebar-character-row").forEach(el => el.remove())

    let characters = new Set()
    this.nodes.forEach(node => {
      if(node.speaker) characters.add(node.speaker)
      if(node.recipient) characters.add(node.recipient)

      if(node.type === "transfer") {
        node.transfer.forEach(row => {
          if(row.owner) characters.add(row.owner)
        })
      }   
    })
    characters.forEach(char => this.createSidebarPersonRow(char))
  }
  createSidebarPersonRow(person) {
    /* note: i should make a fallback empty.png character if there isn't an image for the person */

    let container = El("div", "sidebar-character-row")
    let thumbnail = El("img", "sidebar-character-thumbnail")
    let name =      El("div", "sidebar-character-name", undefined, data.person[person].displayName)

    if(this.characters.findChild(person))
      thumbnail.src = `assets/portraits/${person}.png`
    else
      thumbnail.src = `assets/portraits/empty.png`

    container.dataset.person = person

    container.append(thumbnail, name)
    Q("#sidebar-right-character-list").append(container)
  }
  newFile() {
    /* this is to prevent saving a file under null */
    if(this.dialogueName) this.storeDialogueData()

    let filename = "dialogue_0"
    let attempts = 0
    const isTaken = (name) => {
      for(let key of this.files.keys())
        if(key === name)
          return true
      return false
    }
    while(isTaken(filename) || this.dialogueName === filename) {
      attempts++
      filename = "dialogue_" + attempts
    }
    this.dialogueName = filename
    
    /* create a file row in the left sidebar */
    this.createSidebarFileRow(filename)

    /* create a tab for this file */
    this.createTabForFile(filename)

    /* send data to the server and make an actual json file */
    Server.saveFile(this.folder, this.dialogueName, this.files.get(this.dialogueName))
    this.storeDialogueData()
    this.clearEditor()
  }
  deleteFile(name) {
    if(!window.confirm(`Really delete file: ${name}?`)) return
    let file = this.files.get(name)
    if(!file) return
    this.files.delete(name)
    console.log(`Deleted file: ${name}`)

    /* remove file tabs and sidebar items */
    Qa(".sidebar-file-row, .dialogue-node-file-tab").forEach(element => {
      if(!this.files.has(element.dataset.filename)) {
        element.remove()
      }
    })

    this.reset()
    this.reconstructHTML()
  }
  openFile(name) {
    let filename = name
    if(!filename) filename = window.prompt("dialogue filename", "intro")
    if(!filename) return

    if(this.files.get(filename))
      this.loadDialogueData(filename)
    else
      this.fetchDialogueData(filename)
  }
  fetchDialogueData(filename) {
    this.storeDialogueData()
    this.clearEditor()

    this.state.set('loading')
    this.dialogueName = filename
    let url = `dialogue/${this.folder}/${filename}.json`

    readJSONFile(url, (text) => {
      let nodes = JSON.parse(text);
      /* create nodes */
      nodes.forEach(node => {
        new DialogueNode(
          node.type, 
          node.text, 
          node.speaker, 
          new Vector(node.pos.x, node.pos.y), 
          node.id, 
          node.criteria,
          {labels: node.labels, factsToSet: node.factsToSet, tree: node.tree, preconditions: node.preconditions, preconditionLogic: node.preconditionLogic},
          node.transfer,
          node.recipient
        )
      })
      /* create connections between nodes */
      nodes.forEach(node => {
        node.out.forEach((outConnection, index) => {
          let origin =      this.nodes.find(n => n.id === node.id)
          let destination = this.nodes.find(n => n.id === outConnection.to)
          origin.createConnection(destination, index)
        })
      })
      /* reconstruct html */
      this.reconstructHTML()
      this.state.set("default")

      /* create a tab for this file */
      this.createTabForFile(filename)

      this.createCharacterList()

      this.storeDialogueData()
    })
  }
  saveFile() {
    /* this will need to be reworked to support the new format for dialogues */

    /* new format structure */
    let header = {
      name: this.dialogueName,
      sections: Array.from(this.sections),
      description: this.description
    }
    let nodes = []
    let exportD = {
      header,
      nodes
    }
    /*  */

    let exportData = []
    this.nodes.forEach(node => {
      let inNodes = node.in.map(n => {return {index: n.index, to: n.from.id}})
      let outNodes = node.out.map(n => {return {index: n.index, to: n.to.id}})

      exportData.push(
        {
          id: node.id,
          pos: node.pos,
          type: node.type,
          speaker: node.speaker,
          recipient: node.recipient,
          transfer: node.transfer,
          labels: node.labels,
          text: node.text,
          factsToSet: node.factsToSet,
          criteria: node.criteria,
          in: inNodes,
          out: outNodes,
          tree: node.tree,
          preconditions: Array.from(node.preconditions),
          preconditionLogic: node.preconditionLogic
        }
      )
    })
    exportToJSONFile(exportData, this.dialogueName)
  }
  storeDialogueData() {
    /* this stores data to this.files, stored under a unified format called DialogueData */
    if(!this.dialogueName) return

    let header = {
      name: this.dialogueName,
      sections: this.sections,
      description: this.description
    }
    let dialogueData = new DialogueData(header, _.cloneDeep(this.nodes))
    this.files.set(this.dialogueName, dialogueData)
  }
  clearEditor() {
    /* this part is almost like a reset() but it doesn't call destroy() on the nodes */
    this.nodes.forEach(node => {
      node.element.remove()
      node.element.classList.remove("active", "selected")
    })
    this.sections.forEach(section => section.elements.container.remove())
    this.nodes = []
    this.sections = new Set()
    this.activeNode = null
    this.selected.nodes = []
    this.selected.connections = []
    this.editedData = {}
    this.reconstructHTML()
  }
  loadDialogueData(filename) {
    /* this loads data from this.files */
    let data
    this.files.forEach(value => {
      if(value.header.name === filename)
        {data = value; console.log("Fopund! あなたを見つけた、この小さな野郎")}
    })
    if(!data) return

    this.storeDialogueData()
    this.clearEditor()

    this.nodes = data.nodes
    for(let key in data.header) {
      this[key] = data.header[key]
    }
    this.nodes.forEach(node => this.element.append(node.element))
    this.sections.forEach(section => this.element.append(section.elements.container))
    
    /* reconstruct html */
    this.reconstructHTML()
    this.state.set("default")

    /* create a tab for this file */
    this.createTabForFile(filename)

    this.createCharacterList()
  }
  hideSidebars() {
    Q("#sidebar-left").classList.add("hidden")
    Q("#sidebar-right").classList.add("hidden")
    this.uiVisible = false
  }
  showSidebars() {
    Q("#sidebar-left").classList.remove("hidden")
    Q("#sidebar-right").classList.remove("hidden")
    this.uiVisible = true
  }
  toggleSidebars() {
    this.uiVisible ? this.hideSidebars() : this.showSidebars()
  }
  createSection() {
    if(this.selected.nodes.length < 1 && !this.activeNode) return

    let section = new DialogueEditorSection()
    this.sections.add(section)
    section.addNodes(...this.selected.nodes)

    if(this.activeNode)
      section.addNodes(this.activeNode)
  }
  createTabForFile(filename) {
    if(Q(`.dialogue-node-file-tab[data-filename=${filename}]`)) return

    let container =   El("div", "dialogue-node-file-tab")
    let title =       El("div", "dialogue-node-file-title", undefined, filename)
    let filler =      El("div", "filler")
    let closeButton = El("div", "dialogue-node-file-close-button", [["title", "Close tab"]])

    container.dataset.filename = filename
    container.append(title, filler, closeButton)
    Q("#navbar-files").append(container)
    this.setTabAsActive(container)
  }
  setTabAsActive(tabElement) {
    /* set all other tabs to not active */
    Qa(".dialogue-node-file-tab").forEach(tab => tab.classList.remove("active"))
    tabElement.classList.add("active")
  }
  pan(offset) {
    this.nodes.forEach(node => node.pos.add(offset))
    this.updateHTML()
  }
  scroll(amt) {
    this.nodes.forEach(node => node.pos.y += amt)
    this.updateHTML()
  }
  scrollSideways(amt) {
    this.nodes.forEach(node => node.pos.x += amt)
    this.updateHTML()
  }
  displayFactSearch() {
    
  }
  hideFactSearch() {

  }
  setPerson(person, role) {
    console.log("setting person: ", person)
    if(this.activeNode.type == "text" || this.activeNode.type == "whisper" || this.activeNode.type == "pass" || this.activeNode.type == "aggression") {
      this.activeNode[role] = person
    }
    else
    if(this.activeNode.type == "transfer") {
      let personIndex = +this.highlighted.closest(".dialogue-node-transfer").dataset.personindex
      this.activeNode.transfer[personIndex].owner = person
    }
    /* set HTML */
    this.highlighted.innerText = person
    this.activeNode.setPersonThumbnail(this.highlighted, person)

    this.lastNpc = person
    this.npcSearchDelete()
  }
  setItem(item) {
    let itemIndex = +this.highlighted.dataset.itemindex
    let speakerRow = this.highlighted.closest(".dialogue-node-transfer")
    let ownerIndex = speakerRow.dataset.personindex
    let owner = speakerRow.querySelector(".dialogue-node-speaker").dataset.speaker

    this.activeNode.transfer[ownerIndex].owner = owner
    this.activeNode.transfer[ownerIndex].items[itemIndex] = item

    let 
    itemThumbnail = new Image()
    itemThumbnail.src = `assets/${data.item[item].folder ?? "item"}/${item}.png`

    let itemElement = speakerRow.querySelector(`.dialogue-node-item[data-itemindex='${itemIndex}']`)

    if(itemElement.querySelector("img"))
      itemElement.querySelector("img").remove()

    itemElement.append(itemThumbnail)
    this.itemSearchDelete()
  }
  unsetItem(itemElement) {
    //this method takes the parameter from an itemElement inside a transfer node, then it determines which slot and which owner should have this item deleted
    let personIndex = +itemElement.closest(".dialogue-node-transfer").dataset.personindex
    let itemIndex = +itemElement.dataset.itemindex
    console.log(personIndex, itemIndex)
    // this.activeNode.element.querySelector(`.dialogue-node-item-container[data-personindex='${personIndex}'`)
    this.activeNode.transfer[personIndex].items[itemIndex] = ""
    itemElement.querySelector("img")?.remove()
    this.itemSearchDelete()
  }
  handleElementEdit(element) {
    this.editedData = {
      content: element.innerText,
      datatype: element.dataset.datatype,
      isBoolean: element.dataset.isboolean === "true",
      parent: element.parentElement,
      element: element,
      node: this.activeNode,
      accessorChain:    element.closest(".requirement-property")?.dataset.accessorchain?.split(" "),
      criterionIndex:   +element.closest(".criterion-container")?.dataset.criterionindex,
      requirementIndex: +element.closest(".criterion-requirement")?.dataset.requirementindex,
      factIndex:        +element.closest(".dialogue-node-fact-row")?.dataset.factindex
    }
    element.replaceWith(this.textarea)
    this.npcSearchDelete()
    this.contextMenuDelete()

    if(this.editedData.isBoolean)
      this.editConfirm(true)
    else
      this.editBegin()
  }
  editBegin() {
    if(this.state.is("editing")) 
      this.editCancel()

    this.textarea.value = this.editedData.element.innerHTML.replaceAll("<br>", "\n")
    this.textarea.style.border = "2px solid var(--color-shield)"
    this.state.set("editing")
    this.textarea.focus()
    this.textarea.select()
  }
  editConfirm(forceExecution) {
    if(this.state.isnt("editing") && !forceExecution) return

    console.log("edit confirm")

    let 
    element = this.editedData.element
    element.innerText = this.textarea.value
    let value = this.textarea.value

    this.textarea.replaceWith(element)

    switch(element.dataset.datatype) {
      case "entry": {
        this.propertiesPanel.setRequirementEntryObject(this.editedData.criterionIndex, this.editedData.requirementIndex, value)
        break
      }
      case "accessorChain": {
        this.propertiesPanel.setRequirementAccessorChain(this.editedData.criterionIndex, this.editedData.requirementIndex, value)
        break
      }
      case "expectedvalue": {
        this.propertiesPanel.flipRequirementExpectedValue(this.editedData.criterionIndex, this.editedData.requirementIndex)
        break
      }
      case "identifier": {
        this.propertiesPanel.setRequirementIdentifier(this.editedData.criterionIndex, this.editedData.requirementIndex, value)
        break
      }
      case "conditionType": {
        this.propertiesPanel.setConditionType(this.editedData.criterionIndex, this.editedData.requirementIndex, value)
        break
      }
      case "conditionTestValue": {
        this.propertiesPanel.setConditionTestValue(this.editedData.criterionIndex, this.editedData.requirementIndex, value)
        break
      }
      case "factValue": {
        this.activeNode.flipSetterFact(this.editedData.factIndex)
        break
      }
      case "nodeFactIdentifier": {
        this.activeNode.setFactIdentifier(this.editedData.factIndex, value)
        break
      }
      case "nodeTree": {
        this.activeNode.setNodeTree(element, value)
        break
      }
      default: {
        this.activeNode[element.dataset.datatype] = value
      }
    }

    this.textarea.style.border = ""
    this.state.set("default")
  }
  editCancel() {
    if(this.state.isnt("editing")) return

    console.log("edit cancel")

    this.textarea.style.border = ""
    this.textarea.replaceWith(this.editedData.element)
    this.state.set("default")
  }
  //#region input
  handleInput(event) {
    this["handle" + event.type.capitalize()](event)
  }
  handleKeydown(event) {
    if(document.activeElement === Q(".fact-search-bar input")) {
      if(event.code === "Escape")
        this.hideFactSearch()
      return
    }
    if(document.activeElement === this.npcSearchInput) {
      if(event.code === "Escape") {
        this.npcSearchDelete()
        return
      }
      this.npcSearchFilter()
      return
    }

    /* when editing a text field */
    if(document.activeElement === this.textarea || this.state.is("editing")) {
      if((event.code === "Enter" || event.code === "NumpadEnter") && (!keys.shift && !keys.shiftRight))
        this.editConfirm()
      if(event.code === "Escape")
        this.editCancel()
      return
    }
    if(document.activeElement === Q("#sidebar-left-search-input")) {
      if(event.code === "Escape")
        document.activeElement.blur()
      return
    }

    /* general cancel event, should hide most searches, popups and context menus */
    if(event.code === "Escape") {
      this.editCancel()
      this.npcSearchDelete()
      this.itemSearchDelete()
      this.contextMenuDelete()
      
      if(this.preconditionSetting.active)
        this.preconditionSetting.deactivate()
      else if(this.selected.nodes.length > 0)
        this.deselectAll()
      else
        this.unsetActiveNode()
    }
    if(event.code === "ShiftLeft") {
      
    }

    if(event.code === "KeyD" && !keys.shift) {
      this.duplicateNode(this.activeNode)
    }
    if(event.code === "KeyD" && keys.shift) {
      this.deselectAll()
    }
    if(event.code === "KeyE") {
      this.saveFile()
    }
    if(event.code === "KeyI") {
      this.openFile()
    }
    if(event.code === "KeyF") {
      this.propertiesPanel.toggle()
    }
    if((event.code === "Delete" || event.code === "Backspace") && this.highlighted && this.highlighted.dataset.datatype === "item") {
      this.unsetItem(this.highlighted)
    }

    /* navigation part */
    if(!keys.shift && this.activeNode) {
      if(event.code === "ArrowLeft") {
        this.getPreviousSiblingNode()
      }
      if(event.code === "ArrowRight") {
        this.getNextSiblingNode()
      }
      if(event.code === "ArrowUp") {
        this.getFirstInputNode()
      }
      if(event.code === "ArrowDown") {
        this.getFirstOutputNode()
      }
    }

    /* node creation shortcuts */
    if(event.code.includesAny("Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9")) {
      let index = +event.code.replaceAll("Digit", "") - 1
      if(!DialogueNode.types[index]) return

      let node = this.createNode(DialogueNode.types[index])
      if(this.activeNode) {
        let connectionIndex = this.connectionData.outputSocketIndex ?? this.activeNode.out.length
        this.activeNode.createConnection(node, connectionIndex)
        this.reconstructHTML()
      }
    }

    /* node nudging */
    if(keys.shift) {
      let nudgeAmount = 10
      let nudgeMultiplier = 1 + 10 * keys.ctrl

      let nodes = new Set()
      this.selected.nodes.forEach(n => nodes.add(n))
      if(this.activeNode) nodes.add(this.activeNode)

      if(event.code === "ArrowLeft") {
        nodes.forEach(n => n.pos.x -= nudgeAmount * nudgeMultiplier)
      } else
      if(event.code === "ArrowRight") {
        nodes.forEach(n => n.pos.x += nudgeAmount * nudgeMultiplier)
      } else
      if(event.code === "ArrowUp") {
        nodes.forEach(n => n.pos.y -= nudgeAmount * nudgeMultiplier)
      } else
      if(event.code === "ArrowDown") {
        nodes.forEach(n => n.pos.y += nudgeAmount * nudgeMultiplier)
      }
      this.updateHTML()
    }

    /* node swap */
    if(event.code === "KeyW") {
      if(this.selected.nodes.length > 1) {
        let swappableProperties = ["pos", "in", "out"]
        for(let prop of swappableProperties) {
          [
            this.selected.nodes[0][prop], 
            this.selected.nodes[1][prop]
          ] = 
          [
            this.selected.nodes[1][prop], 
            this.selected.nodes[0][prop]
          ]
        }
        this.reconstructHTML()
      }
    }

    /* create section */
    if(event.code === "KeyS" && !keys.shift) {
      this.createSection()
    }
    if(event.code === "KeyS" && keys.shift) {
      this.storeDialogueData()
    }

    /* open folder */
    if(event.code === "KeyO") {
      this.openFolder()
    }

    /* toggle UI */
    if(event.code === "KeyU") {
      this.toggleSidebars()
    }

    /* new file */
    if(event.code === "KeyN") {
      this.newFile()
    }
    
    /* break connections */
    if(event.code === "KeyB") {
      let nodes = new Set()
      this.selected.nodes.forEach(n => nodes.add(n))
      if(this.activeNode) nodes.add(this.activeNode)

      this.breakConnectionsFor(...nodes)
    }

    /* auto-connect nodes */
    let nodes = [...this.selected.nodes]
    if(this.activeNode) nodes.push(this.activeNode)


    /* mass delete */
    if(event.code === "KeyX" && (this.selected.nodes.length || this.activeNode)) {
      let nodes = new Set()
      this.selected.nodes.forEach(n => nodes.add(n))
      if(this.activeNode) nodes.add(this.activeNode)

      if(window.confirm(`Delete ${nodes.size} nodes?`)) {
        nodes.forEach(n => n.destroy())
      }
    }

    /* tidy up */
    if(event.code === "KeyT") {
      this.setOptionTidyUp()
    }
    if(event.code === "KeyH") {
      this.setOptionStackHorizontally()
    }
    if(event.code === "KeyV") {
      this.setOptionStackVertically()
    }
    if(event.code === "KeyC") {
      this.setOptionClearNodeOverlaps()
    }
  }
  handleKeyup(event) {
    if(document.activeElement === this.npcSearchInput) {
      this.npcSearchFilter()
    }
  }
  handleMousedown(event) {
    switch(event.button) {
      case 0: {this.handleLeftDown(event);   break}
      case 1: {this.handleMiddleDown(event); break}
      case 2: {this.handleRightDown(event);  break}
    }
  }
  handleLeftDown(event) {
    let target = event.target

    /* create new file in case this.dialogueName is null */
    if(!this.dialogueName && target === this.element) {
      this.newFile()
    }
    if(this.state.is("editing")) {
      /* when you click on another node */
      if(target.closest(".dialogue-node") && +target.closest(".dialogue-node").dataset.id !== this.activeNode.id) 
        this.editCancel() 
      else
      /* when you click outside of a node */
      if(!target.closest(".dialogue-node") && !target.closest(".fact-editor")) 
        this.editCancel()
    }

    if(target.closest(".dialogue-node")) {
      let sameNodeAsBefore = target.closest(".dialogue-node") === this.activeNode?.element

      /* if precondition setting then you do not set the clicked nodes as active but set it as a precondition to the active node */
      if(this.preconditionSetting.active && !sameNodeAsBefore) {
        let node = this.nodes.find(n => n.id === +target.closest(".dialogue-node").dataset.id)
        if(node === this.activeNode) return alert("")
        if(this.activeNode.preconditions.has(node.id)) {
          this.activeNode.preconditions.delete(node.id)
          node.element.classList.remove("precondition")
        }
        else {
          this.activeNode.preconditions.add(node.id)
          node.element.classList.add("precondition")
        }
        return
      }
      else {
        if(!sameNodeAsBefore) 
          this.preconditionSetting.deactivate()
        this.setActiveNode(event)
      }
      if(this.propertiesPanel.open && !sameNodeAsBefore) {
        this.propertiesPanel.refreshStructure()
      }
    }

    if(target.closest(".dialogue-node-socket.out")) {
      this.state.set("connecting")
      this.connectionData.outputSocketIndex = +target.closest(".dialogue-node-socket.out").dataset.index
      this.showPlaceholderSocket()
    }

    if(target.closest(".dialogue-node") && (keys.shift || keys.shiftRight)) {
      this.state.set("connecting")
      this.showPlaceholderSocket()
    }

    if(target.closest(".dialogue-node-label")) {
      let label = target.closest(".dialogue-node-label")
      let labelValue = label.dataset.nodelabel
      this.activeNode.labels[labelValue] = !this.activeNode.labels[labelValue]
      if(this.activeNode.labels[labelValue])
        label.classList.add("active")
      else
        label.classList.remove("active")
    }

    if(target.closest("[data-editable='true']")){
      this.handleElementEdit(target.closest("[data-editable='true']"))
    }

    /* speaker selection logic */
    if(target.closest(".dialogue-node *[data-datatype='speaker']")) {
      if(this.state.is("selectingSpeaker")) {
        this.npcSearchDelete()
        return
      }

      this.highlighted = target.closest("[data-datatype='speaker']")
      this.highlighted.style.outline = "2px solid var(--color-shield)"
      this.state.set("selectingSpeaker")
      this.npcSearchCreate("speaker")
    }
    if(target.closest(".dialogue-node *[data-datatype='recipient']")) {
      if(this.state.is("selectingSpeaker")) {
        this.npcSearchDelete()
        return
      }

      this.highlighted = target.closest("[data-datatype='recipient']")
      this.highlighted.style.outline = "2px solid var(--color-shield)"
      this.state.set("selectingSpeaker")
      this.npcSearchCreate("recipient")
    }

    if(target.closest(".dialogue-node *[data-datatype='item']")) {
      if(this.itemSearch) {
        this.itemSearchDelete()
        return
      }
      this.highlighted = target.closest("[data-datatype='item']")
      this.highlighted.style.outline = "2px solid var(--color-shield)"
      this.state.set("selectingItem")
      this.itemSearchCreate()
    }
    
    /* conditions for beginning the drag operation, the user must click a non-functional part of the node DIRECTLY */
    if(
      target.closest(".dialogue-node") 
      && !keys.shift
      && (
        target.classList.contains("dialogue-node")
        || target.classList.contains("dialogue-node-header")
        || target.classList.contains("dialogue-node-title")
        || target.classList.contains("dialogue-node-icon")
        || target.classList.contains("fact-count")
        || target.classList.contains("filler") 
        || target.classList.contains("dialogue-node-content")
      )
    )
    {
      this.editCancel()
      this.state.set("dragging")
    }


    if(target.closest("#sidebar-left-hide-arrow")) {
      Q("#sidebar-left").classList.toggle("hidden")
    }
    if(target.closest("#sidebar-right-hide-arrow")) {
      Q("#sidebar-right").classList.toggle("hidden")
    }

    if(target.closest(".dialogue-name")) {
      let newName = window.prompt("Rename dialogue", this.dialogueName)
      this.dialogueName = newName ?? this.dialogueName
      Q(".dialogue-name").innerText = this.dialogueName
    }

    if(target.closest(".dialogue-node-add-fact-button")) {
      this.activeNode?.addSetterFact()
    }

    if(target.closest(".dialogue-node-fact-delete-button")) {
      let index = +target.closest(".dialogue-node-fact-row").dataset.factindex
      this.activeNode?.removeSetterFact(index)
    }

    if(target.closest(".dialogue-node-widget.remove")) {
      if(target.closest(".dialogue-node")) {
        this.editCancel()
        this.state.set("deleting")
      }
      if(target.closest(".fact-container")) {
        this.propertiesPanel.toggle(event)
      }
    }

    if(target.closest(".fact-editor-delete-criterion-button")) {
      let index = +target.closest(".criterion-container").dataset.criterionindex
      this.propertiesPanel.deleteCriterion(index)
    }

    if(target.closest(".criterion-requirement-delete-button")) {
      let requirementIndex =  +target.closest(".criterion-requirement").dataset.requirementindex
      let criterionIndex =    +target.closest(".criterion-container").dataset.criterionindex
      this.propertiesPanel.deleteRequirementFromCriterion(criterionIndex, requirementIndex)
    }

    if(target.closest(".criterion-requirement-toggle")) {
      let requirementIndex =  +target.closest(".criterion-requirement").dataset.requirementindex
      let criterionIndex =    +target.closest(".criterion-container").dataset.criterionindex
      this.propertiesPanel.toggleRequirementType(criterionIndex, requirementIndex)
    }

    if(target === this.element) {
      this.unsetActiveNode()
      this.state.set("creating")
    }

    if(target.closest("path.node-connection")) {
      let svg = target.closest("svg")
      let node = this.nodes.find(node => node.id === +event.target.closest("svg").dataset.id)
      let index = +svg.dataset.index
      if(Q(".insert-node-widget")) {
        /* add a node in between the two adjacent nodes */
        let newNode = this.createNode("text")
        let oldConn = node.out[index]
        node.deleteConnection(index)
        node.createConnection(newNode)
        newNode.createConnection(oldConn.to)

        /* measure height of the new node and add this to the bottom node */
        let lastNode = oldConn.to
        let height = lastNode.element.getBoundingClientRect().height
        lastNode.pos.y += height + 20

        /* ideally this should be recursive and offset everything that's below the nodes in the chain */
        /* or, it would only offset the nodes if there wasn't enough space */
      }
      else {
        node.deleteConnection(index)
      }
      this.reconstructHTML()
    }

    if(target.closest(".search-popup-row")) {
      if(target.closest(".search-popup-row[data-datatype='item']") && keys.ctrl) {
        let item = target.closest(".search-popup-row[data-datatype='item']").dataset.item
        this.unsetItem(item)
      }
      else
      if(target.closest(".search-popup-row[data-datatype='item']")) {
        let item = target.closest(".search-popup-row[data-datatype='item']").dataset.item
        this.setItem(item)
      }
      
      if(target.closest(".search-popup-row[data-datatype='speaker']")) {
        let speaker = target.closest(".search-popup-row").dataset.speaker
        this.setPerson(speaker, "speaker")
      }

      if(target.closest(".search-popup-row[data-datatype='recipient']")) {
        let recipient = target.closest(".search-popup-row").dataset.speaker
        this.setPerson(recipient, "recipient")
      }
    }

    if(target.closest(".sidebar-file-row")) {
      let filename = target.closest(".sidebar-file-row").dataset.filename
      let tab = Q(`.dialogue-node-file-tab[data-filename=${filename}]`)
      if(target.closest(".dialogue-node-file-close-button")) {
        this.deleteFile(filename)
      }
      else {
        this.openFile(filename)
        if(tab) {
          this.setTabAsActive(tab)
        }
        else {
          this.createTabForFile(filename)
        }
      }
    }

    if(target.closest("#toggle-sidebars-icon")) {
      this.toggleSidebars()
    }

    if(target.closest(".dialogue-node-file-tab")) {
      let tab = target.closest(".dialogue-node-file-tab")
      let filename = target.closest(".dialogue-node-file-tab").dataset.filename
      if(target.closest(".dialogue-node-file-close-button")) {
        tab.remove()
      }
      else {
        this.openFile(filename)
        this.setTabAsActive(tab)
      }
    }

    if(target.closest("#add-file-button")) {
      this.newFile()
    }

    //add an empty item slot into a transfer node
    if(target.closest(".dialogue-node .dialogue-node-icon.plus")) {
      let personIndex = +target.closest(".dialogue-node .dialogue-node-icon.plus").dataset.personindex
      let itemContainer = target.closest(`.dialogue-node .dialogue-node-item-container[data-personindex='${personIndex}']`)
      let itemIndex = Array.from(itemContainer.querySelectorAll(".dialogue-node-item")).length
      console.log(itemIndex)

      let 
      newItem = El("div", "dialogue-node-item empty")
      newItem.dataset.datatype = "item"
      newItem.dataset.itemindex = itemIndex
      itemContainer.append(newItem)
    }

    if(target.closest(".icon-export-facts")) {
      this.saveFile()
    }

    if(target.closest(".icon-import")) {
      this.openFile()
    }

    if(target.closest(".sidebar-folder-icon")) {
      this.openFolder()
    }

    if(target.closest(".dialogue-editor-option")) {
      let optionElement = target.closest(".dialogue-editor-option")
      this["setOption" + optionElement.dataset.option.capitalize()]()
      this.options[optionElement.dataset.option] ? 
      optionElement.classList.add("active") : 
      optionElement.classList.remove("active")
    }

    if(target.closest(".context-menu-option")) {
      let option = target.closest(".context-menu-option")
      let node = this.createNode(option.dataset.type, option.dataset.isplayer.bool())
      this.setActiveNode({target: node.element})
      this.contextMenuDelete()
    }

    if(target.closest(".fact-value") && target.closest(".fact-list")) {
      let value = event.target.closest(".fact-value")
      let node = this.nodes.find(n => n.id === +value.dataset.nodeid)
      let identifier = this.propertiesPanel.list.querySelector(`[data-identifier='${value.dataset.identifier}']`).dataset.identifier
      let fact = node.facts.find(fact => fact.identifier === identifier)
      fact.value = !fact.value
      value.innerText = fact.value.toString()
      fact.value ? value.classList.replace("false", "true") : value.classList.replace("true", "false")
      if(typeof fact.value !== "boolean") 
        alert('not boolean')
    }

    if(target.closest(".dialogue-node-widget.list")) {
      this.propertiesPanel.toggle()
    }

    if(target.closest(".dialogue-node-widget.precondition")) {
      target.closest(".dialogue-node-widget.precondition").classList.add("active")
      this.preconditionSetting.toggle()
    }
    if(target.closest(".dialogue-node-widget.precondition-logic")) {
      if(this.activeNode.preconditionLogic === "OR") {
        target.closest(".dialogue-node-widget.precondition-logic").classList.replace("or", "and")
        this.activeNode.preconditionLogic = "AND"
      }
      else {
        target.closest(".dialogue-node-widget.precondition-logic").classList.replace("and", "or")
        this.activeNode.preconditionLogic = "OR"
      }
    }

    if(target.closest(".fact-editor .dialogue-node-widget.remove")) {
      this.propertiesPanel.hide()
    }
    if(target.closest(".dialogue-editor-section-title")) {
      let title = target.closest(".dialogue-editor-section-title")
      let section = Array.from(this.sections).find(s => s.elements.title === title)
      if(keys.ctrl) {
        section.setName( window.prompt("Enter new name", title.innerText) ?? title.innerText )
      }
      else {
        section.nodes.forEach(node => this.selectNode(node))
        this.state.set("dragging")
      }
    }
    if(target.closest(".dialogue-editor-section-delete-button")) {
      let button = target.closest(".dialogue-editor-section-delete-button")
      let section = Array.from(this.sections).find(s => s.elements.deleteButton === button)
      if(keys.shift) {
        if((this.options.safeMode && window.confirm(`Delete node${section.nodes.length > 1 ? "s" : ""}?`)) || !this.options.safeMode)
          section.nodes.forEach(node => node.destroy())
      }
      section.destroy()
    }
  }
  handleMiddleDown(event) {
    let target = event.target
    if(target.closest(".fact-editor")) return

    this.state.set("panning")
  }
  handleRightDown(event) {
    let target = event.target

    if(target === this.element)
      this.state.set("creatingContextMenu")
  }
  handleMousemove(event) {
    if(this.state.is("dragging")) {
      this.activeNode?.drag(event)
      this.selected.nodes.forEach(node => {
        if(node !== this.activeNode) node.drag(event)
      })

      /* highlight sections if the nodes are dragged into them */
      if(keys.shift) {

      }
    }
    if(this.state.is("panning")) {
      this.pan(mouse.clientMoved)
    }
    if(this.state.is("connecting")) {
      this.connectionData.placeholderSocket.style.left = mouse.clientPosition.x + "px"
      this.connectionData.placeholderSocket.style.top =  mouse.clientPosition.y + "px"
    }
    if(this.state.is("creating")) {
      this.boxSelection.begin()
      this.state.set("boxSelection")
    }
    if(this.state.is("boxSelection")) {
      this.boxSelection.update()
    }

    /* construct a plus that will allow for node insertion and also layout adjustment */
    if(event.target.closest("path.node-connection") && keys.shift) {
      let widget = Q(".insert-node-widget")

      if(widget) {
        widget.style.left = mouse.clientPosition.x - 16 + "px"
        widget.style.top = mouse.clientPosition.y - 16 + "px"
        return
      }
      
      let 
      plus = El("div", "insert-node-widget")
      plus.style.left = mouse.clientPosition.x + "px"
      plus.style.top = mouse.clientPosition.y + "px"
      let 
      img = new Image()
      img.src = "assets/icons/iconPlus.png"
      plus.append(img)
      this.element.append(plus)
    }
    else {
      Qa(".insert-node-widget").forEach(el => el.remove())
    }

    this.updateHTML()
  }
  handleMouseup(event) {
    /* LMB */
    if(event.button === 0) {
      if(this.state.is("connecting") && event.target.closest(".dialogue-node")) {
        let node = this.getNodeAtMousePosition(event)
        this.activeNode.createConnection(node, this.connectionData.outputSocketIndex)
        this.unsetActiveNode()
      }
      if(this.state.is("connecting") && event.target === this.element) {
        let node = this.createNode("text")
        this.activeNode.createConnection(node, this.connectionData.outputSocketIndex)
        this.setActiveNode({target: node.element})
      }
      if(this.state.is("creating") && event.target === this.element) {
        let node = this.createNode("text")
        this.setActiveNode({target: node.element})
        this.propertiesPanel.refreshStructure()
      }
      if(this.state.is("deleting") && event.target.closest(".dialogue-node-widget.remove")) {
        if((this.options.safeMode && window.confirm("Delete node?")) || !this.options.safeMode) {

          /* reroute input nodes around activeNode, if holding shift */
          if(keys.shift && this.activeNode.in.length && this.activeNode.out.length) {
            let newOutputs = []
            let inputNodes = []
            this.activeNode.in.forEach(inConn => {
              let inputNode = inConn.from

              /* store the outputs temporarily */
              inputNodes.push(inputNode)
              newOutputs.push(
                [...this.activeNode.out].map(conn => {return {index: conn.index, to: conn.to}})
              )
            })
            this.breakConnectionsFor(this.activeNode)

            /* establish new connections based on the stored outputs */
            inputNodes.forEach((node, index) => {
              newOutputs[index].forEach(conn => {
                node.createConnection(conn.to)
              })
            })
          }
          /* destroy the node regardless */
          this.activeNode.destroy()
        }
          
      }
      if(this.state.is("boxSelection")) {
        this.boxSelection.end()
      }
      this.contextMenuDelete()
    }
    
    /* RMB */
    if(event.button === 2) {
      if(this.state.is("creatingContextMenu") && event.target === this.element) {
        this.contextMenuCreate()
      }
    }

    /* all buttons */
    if(this.state.is("dragging") && this.propertiesPanel.open) {
      this.propertiesPanel.show(event)
    }

    /* add node to different section, if you stop the dragging operation over it */
    if(this.state.is("dragging")) {
      let section = this.getSectionUnderCursor()
      if(section) {
        section.addNodes(...this.selected.nodes)
        if(this.activeNode) 
          section.addNodes(this.activeNode)
      }
    }

    /* this part should be final, as it resets the main state */
    if(this.state.isnt("editing", "selectingSpeaker", "selectingItem")) {
      this.state.set("default")
    }
    this.connectionData.placeholderSocket.classList.add("hidden")
    this.propertiesPanel.toggleEditability()
    this.reconstructHTML()
  }
  handleWheel(event) {
    if(event.target.closest(".fact-editor")) return
    if(event.target.closest(".search-popup")) return

    if(keys.shift)
      this.scrollSideways(-event.deltaY)
    else
      this.scroll(-event.deltaY)
  }
  //#endregion input
  //#region options
  setOptionSafeMode() {
    this.options.safeMode = ! this.options.safeMode
  }
  async setOptionCompactView() {
    /* this method causes a truncation error somewhere and the nodes are getting further apart with each click */

    this.nodes.forEach(node => {
      node.temp = {} 
      node.temp.height = node.element.getBoundingClientRect().height
    })

    this.options.compactView = !this.options.compactView
    this.options.compactView ? 
    this.element.classList.add("compact-view") : 
    this.element.classList.remove("compact-view")

    await waitFor(200)
    
    let avgHeightDifference = avg(...this.nodes.map(node => node.element.getBoundingClientRect().height / node.temp.height))
    
    this.nodes.forEach(node => node.pos.y *= avgHeightDifference)
    this.reconstructHTML()
  }
  setOptionTidyUp(forceDirection = null) {
    let spacing = 20

    let topMost =     Math.min(...this.selected.nodes.map(node => node.pos.y))
    let bottomMost =  Math.max(...this.selected.nodes.map(node => node.pos.y))
    let leftMost =    Math.min(...this.selected.nodes.map(node => node.pos.x))
    let rightMost =   Math.max(...this.selected.nodes.map(node => node.pos.x))

    let isHorizontal = (Math.abs(bottomMost - topMost) / Math.abs(leftMost - rightMost)) < 1

    if(forceDirection == "vertical") isHorizontal = false
    if(forceDirection == "horizontal") isHorizontal = true

    /* okay this shit is wack, if the nodes aren't all the same dimension, this breaks */
    if(isHorizontal) {
      this.selected.nodes = this.selected.nodes.sort((a, b) => a.pos.x - b.pos.x)
      let rects = this.selected.nodes.map(node => node.element.getBoundingClientRect())

      this.selected.nodes.forEach((node, index) => {
        node.pos.y = topMost
        if(index === 0) return
        
        let xOffset = rects[0].left
        for(let j = 0; j < index; j++) {
          xOffset += rects[j].width + spacing
        }
        node.pos.x = xOffset
      })
    }
    else {
      this.selected.nodes = this.selected.nodes.sort((a, b) => a.pos.y - b.pos.y)
      let rects = this.selected.nodes.map(node => node.element.getBoundingClientRect())
      
      let extraOffset = 0

      this.selected.nodes.forEach((node, index) => {
        node.pos.x = leftMost
        if(index === 0) return
        
        let yOffset = rects[0].top
        for(let j = 0; j < index; j++) {
          yOffset += rects[j].height + spacing
        }

        /* minor adjustments per node type */
        if(this.selected.nodes[index - 1].type === "responsePicker")
          extraOffset += 20

        node.pos.y = yOffset + extraOffset
      })
    }
    this.updateHTML()
  }
  setOptionStackHorizontally() {
    this.setOptionTidyUp("horizontal")    
  }
  setOptionStackVertically() {
    this.setOptionTidyUp("vertical")
  }
  setOptionClearNodeOverlaps() {

  }
  //#endregion
  contextMenuCreate() {
    if(this.contextMenu) 
      this.contextMenuDelete()

    let menu =  El("div", "context-menu")
    let title = El("div","context-menu-title", undefined, "Select node type")
    menu.append(title)

    for(let type of DialogueNode.types) {
      let option = El("div", "context-menu-option")
      option.innerText = type.replaceAll("-", " ").splitCamelCase().capitalize()
      option.dataset.type = type
      option.dataset.isplayer = false
      
      let index = El("div", "context-menu-index")
      index.innerText = DialogueNode.types.indexOf(type) + 1

      option.append(index)
      menu.append(option)
    }
    menu.style.left = (mouse.clientPosition.x + 5) + "px"
    menu.style.top =  (mouse.clientPosition.y + 5) + "px"
    
    this.element.append(menu)
    this.contextMenu = menu
    this.fitInViewport(this.contextMenu)
  }
  contextMenuDelete() {
    if(!this.contextMenu) return
    
    this.contextMenu.remove()
    this.contextMenu = null
  }
  npcSearchCreate(role) {
    this.npcSearchDelete()
    let popup =         El("div", "search-popup")
    let itemContainer = El("div", "search-popup-item-list")
    let input =         El("input", "search-popup-input", [["type", "text"]])

    const createField = (speaker) => {
      let row =   El("div", "search-popup-row", undefined, undefined, [["datatype", role],["speaker", speaker]])
      let name =  El("div", "search-popup-name", undefined, speaker)

      let 
      img = new Image()
      img.src = speaker.includes("variable") ? "assets/icons/iconSpeaker.png" : "assets/portraits/" + speaker + ".png"

      row.append(img, name)
      itemContainer.append(row)
    }

    for(let prop in data.person) 
      createField(prop)

    popup.append(input, itemContainer)
    popup.style.left = (mouse.clientPosition.x + 5) + "px"
    popup.style.top = (mouse.clientPosition.y + 5) + "px"

    this.element.append(popup)
    this.npcSearch = popup
    this.npcSearchInput = input
    setTimeout(() => this.fitInViewport(this.npcSearch), 0)
  }
  npcSearchFilter() {
    Qa(".search-popup-row").forEach(row => {
      let name = row.querySelector(".search-popup-name")
      if(name.innerText.toLocaleLowerCase().includes(this.npcSearchInput.value.toLocaleLowerCase()))
        row.classList.remove("hidden")
      else
        row.classList.add("hidden")
    })
  }
  npcSearchDelete() {
    if(!this.npcSearch) return

    this.npcSearch.remove()
    this.npcSearch = null
    this.highlighted.style.outline = ""
    this.highlighted = null
    this.state.ifrevert("selectingSpeaker")
  }
  itemSearchCreate() {
    let popup =         El("div", "search-popup")
    let input =         El("input", "search-popup-input", [["type", "text"]])
    let itemContainer = El("div", "search-popup-item-list")

    const createItemElement = (prop) => {
      let row = El("div", "search-popup-row")
          row.dataset.datatype = "item"
      let name = El("div", "search-popup-name", undefined, prop)
      let img = new Image()
          img.src = `assets/${data.item[prop].folder ?? "item"}/${prop}.png`

      row.append(img, name)
      row.dataset.item = prop
      itemContainer.append(row)
    }
    /* generate elements for all items */
    for(let prop in data.item)
      createItemElement(prop)

    popup.append(input, itemContainer)
    popup.style.left = (mouse.clientPosition.x + 5) + "px"
    popup.style.top = (mouse.clientPosition.y + 5) + "px"
    this.element.append(popup)
    this.itemSearch = popup
    setTimeout(() => this.fitInViewport(this.itemSearch), 0)
  }
  itemSearchDelete() {
    if(!this.itemSearch) return

    this.itemSearch.remove()
    this.itemSearch = null
    this.highlighted.style.outline = ""
    this.highlighted = null
    this.state.ifrevert("selectingItem")
  }
  fitInViewport(popupElement) {
    let rect = popupElement.getBoundingClientRect()
    if(rect.bottom > ch) {
      let top = ch - rect.height - 20
      popupElement.style.top = top + "px"
    }
    if(rect.right > cw) {
      let left = cw - rect.width - 20
      popupElement.style.left = left + "px"
    }
  }
  showPlaceholderSocket() {
    this.connectionData.placeholderSocket.classList.remove("hidden")
    this.connectionData.placeholderSocket.style.left = mouse.clientPosition.x + "px"
    this.connectionData.placeholderSocket.style.top =  mouse.clientPosition.y + "px"
  }
  createNode(type) {
    let node = new DialogueNode(
      type, 
      "Lorem Ipsum",
      this.lastNpc, 
      mouse.clientPosition, 
      undefined, 
      undefined, 
    )

    this.contextMenuDelete()
    this.deselectAll()
    
    /* test whether mouse is inside of any section */
    let section = this.getSectionUnderCursor()
    section?.addNodes(node)
    return node
  }
  getSectionUnderCursor() {
    /* this will find the first matching section */
    let section 
    let sections = Array.from(this.sections)
    for(let s of sections) {
      let rect = s.elements.container.getBoundingClientRect()
      if(rect.left                < mouse.clientPosition.x
        && rect.left + rect.width > mouse.clientPosition.x
        && rect.top               < mouse.clientPosition.y
        && rect.top + rect.height > mouse.clientPosition.y
      ) {
        section = s
        break
      }
    }
    return section
  }
  setActiveNode(event) {
    this.unsetActiveNode()
    let 
    target = event.target.closest(".dialogue-node")
    target.classList.add('active')

    this.activeNode = this.nodes.find(node => node.id === +target.dataset.id)
    
    /* set styles to highlight connected nodes */
    this.activeNode.element.style.zIndex = 4
    this.nodes.forEach(node => node.element.classList.remove("highlighted", "input-node"))
    this.activeNode.in.forEach(connection => {
      let node = connection.from
      node.element.classList.add("highlighted", "input-node")
      node.element.style.zIndex = 3
    })
    this.activeNode.out.forEach(connection => {
      let 
      node = connection.to
      node.element.classList.add("highlighted")
      node.element.style.zIndex = 3
    })
    this.activeNode.preconditions.forEach(nodeId => {
      let 
      node = this.nodes.find(n => n.id === nodeId)
      node.element.classList.add("precondition")
      node.element.style.zIndex = 3
    })

    /* refresh propertiesPanel, even if it isn't visible */
    this.propertiesPanel.refreshStructure()
  }
  unsetActiveNode() {
    this.activeNode?.element.classList.remove("active")
    this.nodes.forEach(node => {
      node.element.classList.remove("highlighted", "precondition")
      node.element.style.zIndex = ""
    })
    this.activeNode = null
    setTimeout(() => {
      if(!this.activeNode) this.propertiesPanel.hide()
    }, 0)
  }
  getNextSiblingNode() {
    this.getSiblingNodeByOffset(1)
  }
  getPreviousSiblingNode() {
    this.getSiblingNodeByOffset(-1)
  }
  getSiblingNodeByOffset(offset) {
    let parent = this.activeNode.in[0]?.from
    if(!parent) return
    let parentOutConn = parent.out.find(conn => conn.to === this.activeNode)
    let indexOfChild = parent.out.indexOf(parentOutConn)
    let sibling = parent.out[indexOfChild + offset]?.to

    if(indexOfChild + offset > parent.out.length - 1)
      sibling = parent.out[0].to
    if(indexOfChild + offset < 0)
      sibling = parent.out.last().to

    this.setActiveNode({target: sibling.element})
    this.panNodeIntoView(this.activeNode)
  }
  getFirstOutputNode() {
    let node = this.activeNode.out[0]?.to
    if(node)
      this.setActiveNode({target: node.element})
    this.panNodeIntoView(this.activeNode)
  }
  getFirstInputNode() {
    let node = this.activeNode.in[0]?.from
    if(node)
      this.setActiveNode({target: node.element})
    this.panNodeIntoView(this.activeNode)
  }
  getNodeAtMousePosition(event) {
    let target = event.target.closest(".dialogue-node")
    if(target) 
      return this.nodes.find(node => node.id === +target.dataset.id)
    return null
  }
  panNodeIntoView(node) {
    let rect = node.element.getBoundingClientRect()
    let offset = new Vector()
    let inset = 240

    if(rect.top < 0 + inset)                offset.y = -rect.top + inset
    if(rect.left < 0 + inset)               offset.x = -rect.left + inset
    if(rect.top + rect.height > ch - inset) offset.y += ch - (rect.top + rect.height) - inset
    if(rect.left + rect.width > cw - inset) offset.x += cw - (rect.left + rect.width) - inset

    this.nodes.forEach(node => node.pos.add(offset))
    this.updateHTML()
  }
  breakConnectionsFor(...nodes) {
    nodes.forEach(node => {
      let outConns = [...node.out]
      let inConns = [...node.in]
      outConns.forEach((conn, index) => node.deleteConnection(index))
      inConns.forEach((conn, index) => {
        let srcNode = conn.from
        let ind = srcNode.out.indexOf(srcNode.out.find(con => con.to === node))
        srcNode.deleteConnection(ind)
      })
    })
    this.reconstructHTML()
  }
  selectNode(node) {
    if(this.selected.nodes.findChild(node)) return

    this.selected.nodes.push(node)
    node.element.classList.add("selected")
  }
  toggleSelectNode(node) {
    if(this.selected.nodes.findChild(node))
      this.deselectNode(node)
    else
      this.selectNode(node)
  }
  deselectNode(node) {
    if(!this.selected.nodes.findChild(node)) return

    node.element.classList.remove("selected")
    this.selected.nodes.remove(node)
  }
  deselectAll() {
    while(this.selected.nodes.length)
      this.deselectNode(this.selected.nodes[0])
  }
  duplicateNode(node) {
    if(!node) return
    let newNode = new DialogueNode(
      _.cloneDeep(node.type),
      _.cloneDeep(node.text),
      _.cloneDeep(node.speaker),
      node.pos.clone().add(new Vector(0, 25)),
      undefined,
      _.cloneDeep(node.facts),
      {labels: _.cloneDeep(node.labels)},
      _.cloneDeep(node.transfer)
    )
    this.setActiveNode({target: newNode.element})
    
    let section = null
    this.sections.forEach(s => {
      if(s.nodes.has(node)) 
        section = s
    })
    section?.nodes.add(newNode)
  }
  reconstructHTML() {
    /* generate svgs for connections */
    this.svgCont.innerHTML = ""
    this.nodes.forEach(node => {
      /* highlight entry and exit nodes for better visual navigation of the node tree */
      node.out.length === 0 ? node.element.classList.add("end-node")    : node.element.classList.remove("end-node")
      node.in.length === 0  ? node.element.classList.add("start-node")  : node.element.classList.remove("start-node")

      /* this is used to offset the paths so it looks like they come from the socket; it's set by CSS so fuck it, just hardcode it here for now, it's fiddly anyways */
      let socketRadius = 7

      node.update()
      node.out.forEach(conn => {
        let svg = SVGEl(
          "svg", 
          "dialogue-node-connection", 
          [
            ["viewBox", "0 0 " + cw + " " + ch],
            ["preserveAspectRatio", "xMinYMax"],
            ["width", cw],
            ["height", ch], 
            ["fill", "none"],
          ]
        )
        let path = SVGEl(
          "path", 
          "node-connection", 
          [
            ["d", "M 0 0 L 250 250"],
            ["stroke", "#393c3f"], 
            ["stroke-width", this.style.connectionWidth],
          ]
        )
        let title = SVGEl("title", "node-connection-title")
        title.textContent = "Break connection"
        let rects = [
          node.element.querySelector(`.dialogue-node-socket.out[data-index='${conn.index}'`).getBoundingClientRect(),
          conn.to.element.querySelector(".dialogue-node-socket.in").getBoundingClientRect()
        ]
        path.setAttribute("d", 
          "M " + (rects[0].x + socketRadius) + " " + (rects[0].y + socketRadius) + 
          "L " + (rects[1].x + socketRadius) + " " + (rects[1].y + socketRadius)
        )
        svg.append(title, path)
        svg.dataset.id = node.id
        svg.dataset.index = conn.index
        this.svgCont.append(svg)
      })
    })
    this.updateHTML()
  }
  updateHTML() {
    /* store information about the position of node sockets */
    let layoutData = {}

    /* update nodes */
    this.nodes.forEach(node => node.update())
      
    /* get layout information */
    this.nodes.forEach((node) => {
      layoutData[node.id] = []
      node.out.forEach(conn => {
        let rects = [
          node.element.querySelector(`.dialogue-node-socket.out[data-index='${conn.index}'`).getBoundingClientRect(),
          conn.to.element.querySelector(".dialogue-node-socket.in").getBoundingClientRect()
        ]
        let path = this.svgCont.querySelector("svg[data-id='" + node.id + "']" + "[data-index='" + conn.index + "']" + " path")
        layoutData[node.id].push({path, rects})
      })
    })

    /* recalculate the SVG paths */
    this.nodes.forEach((node) => {
      node.out.forEach((conn, index) => {
        let layoutBlock = layoutData[node.id][index]
        layoutData[node.id][index].path.setAttribute("d",
          "M " + (layoutBlock.rects[0].x + 6) + " " + (layoutBlock.rects[0].y + 6) + 
          "L " + (layoutBlock.rects[1].x + 6) + " " + (layoutBlock.rects[1].y + 6)
        )
      })
    })
  }
  reset() {
    let nodes = [...this.nodes]
    nodes.forEach(node => node.destroy())
    this.dialogueName = null
    this.nodes = []
    this.activeNode = null
    this.selected.nodes = []
    this.selected.connections = []
    this.editedData = {}
    this.updateHTML()
  }
  update() {
    /* autoPan */
    if(this.state.is("connecting", "boxSelection")) {
      /* test whether the mouse is too close to an edge */
      let edgeDistance = 100
      let maxSpeed = this.autoPan.maxSpeed
      let vec = new Vector()
      let expression
      if(mouse.clientPosition.x < edgeDistance) {
        expression = (edgeDistance - mouse.clientPosition.x)/4
        vec.x += clamp(expression, 1, maxSpeed)
      }
      if(mouse.clientPosition.y < edgeDistance) {
        expression = (edgeDistance - mouse.clientPosition.y)/4
        vec.y += clamp(expression, 1, maxSpeed)
      }
      if(mouse.clientPosition.x > cw - edgeDistance) {
        expression = -(cw - edgeDistance - mouse.clientPosition.x)/4
        vec.x -= clamp(expression, 1, maxSpeed)
      }
      if(mouse.clientPosition.y > ch - edgeDistance) {
        expression = -(ch - edgeDistance - mouse.clientPosition.y)/4
        vec.y -= clamp(expression, 1, maxSpeed)
      }

      if(vec.length() !== 0) {
        this.pan(vec)
        this.autoPan.active = true
        this.autoPan.maxSpeed = clamp(this.autoPan.maxSpeed + 0.25, 0, 30)

        /* update box selection */
        this.boxSelection.startPoint.add(vec)
        this.boxSelection.update(new Vector())
        this.boxSelection.updateVisual()
      }
      else {
        this.autoPan.maxSpeed = 1
        this.autoPan.active = false
      }
    }

    /* update sections but only if not dragging nodes */
    if(!keys.shift)
      this.sections.forEach(s => s.update())
  }
  //#region debugging methods
  checkForDuplicateIds() {
    let ids = []
    this.nodes.forEach(node => {
      if(ids.find(id => id === node.id))
        ids.push(node.id)
    })
    if(ids.length) 
      console.log('found duplicates', ids)
  }
  //#endregion
}