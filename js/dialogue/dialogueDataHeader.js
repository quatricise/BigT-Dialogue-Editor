class DialogueDataHeader {
  constructor(name, description, sections, stacks, characterVariables, isFileSaved) {
    /** @type String */  this.dialogueName =        name               ?? ""
    /** @type String */  this.dialogueDescription = description        ?? ""
    /** @type Set */     this.sections =            sections           ?? new Set()
    /** @type Set */     this.stacks =              stacks             ?? new Set()
    /** @type Map */     this.characterVariables =  characterVariables ?? new Map()
    /** @type Boolean */ this.isFileSaved =         isFileSaved        ?? true
  }
  static toObj(header) {
    let obj = {}
    for(let key in header) {
      switch(key) {
        case "dialogueName": {
          obj.dialogueName = header.dialogueName
          break
        }
        case "dialogueDescription": {
          obj.dialogueDescription = header.dialogueDescription
          break
        }
        case "sections": {
          obj.sections = []
          header.sections.forEach(section => {
            obj.sections.push(DialogueEditorSection.toObj(section))
          })
          break
        }
        case "stacks": {
          obj.stacks = []
          header.stacks.forEach(stack => {
            let ids = []
            stack.nodes.forEach(node => ids.push(node.id))
            obj.stacks.push(ids)
          })
          console.log(obj.stacks)
          break
        }
        case "characterVariables": {
          /* !!!!!not done, storing these is a nightmare */
          obj.characterVariables = header.characterVariables
          break
        }
        case "isFileSaved": {
          /* don't save this */
          break
        }
        default: {
          throw "Unhandled case: " + key
        }
      }
    }
    return obj
  }
  static fromObj(obj) {
    let header = new DialogueDataHeader()
    for(let key in header) {
      switch(key) {
        case "dialogueName": {
          header.dialogueName = obj.dialogueName
          break
        }
        case "dialogueDescription": {
          header.dialogueDescription = obj.dialogueDescription
          break
        }
        case "sections": {
          obj.sections.forEach(section => {
            header.sections.add(DialogueEditorSection.fromObj(section))
          })
          break
        }
        case "stacks": {
          header.stacks = new Set()
          obj.stacks.forEach(stackPlain => {
            let nodes = stackPlain.map(nodeId => dialogueEditor.nodes.find(node => node.id === nodeId))
            let stack = new DialogueNodeStack(nodes, stackPlain.type)
            header.stacks.add(stack)
          })
          break
        }
        case "characterVariables": {
          header.characterVariables = new Map()
          break
        }
        case "isFileSaved": {
          /* that's because when loading from a save file, the data obviously is saved */
          header.isFileSaved = true
          break
        }
        default: {
          throw "Unhandled case: " + key
        }
      }
    }
    return header
  }
  /* this is very important, this translates the header properties to the dialogue editor */
  apply() {
    for(let key in this) {
      dialogueEditor[key] = this[key]
    }
  }
}